// @flow
import React, { Component } from 'react';
import { Button, Divider, Form, Message, Icon, Segment } from 'semantic-ui-react';
import { translate } from 'react-i18next';
import { findIndex } from 'lodash';
import { get } from 'dot-prop-immutable';

import debounce from 'lodash/debounce';
import FormFieldMultiToken from '../../../../Global/Form/Field/MultiToken';
import FormMessageError from '../../../../Global/Form/Message/Error';
import GlobalFormFieldAccount from '../../../../Global/Form/Field/Account';
import GlobalFormFieldMemo from '../../../../Global/Form/Field/Memo';
import WalletPanelFormTransferSendConfirming from './Send/Confirming';

class WalletPanelFormTransferSend extends Component<Props> {
  constructor(props) {
    super(props);
    this.state = {
      asset: props.connection.chainSymbol || 'ENU',
      confirming: false,
      formError: false,
      from: props.settings.account,
      memo: '',
      memoValid: true,
      quantity: '',
      submitDisabled: true,
      to: '',
      toValid: true,
      waiting: false,
      waitingStarted: 0
    };
  }

  onConfirm = () => {
    const {
      from,
      memo,
      quantity,
      asset,
      to
    } = this.state;
    this.setState({ confirming: false }, () => {
      this.props.actions.transfer(from, to, quantity, memo, asset);
    });
  }

  onSubmit = () => {
    this.setState({
      confirming: true,
      waiting: true,
      waitingStarted: new Date()
    });
    const tick = setInterval(this.tick, 250);
    // Make the user wait 3 seconds before they can confirm
    setTimeout(() => {
      clearInterval(tick);
      this.setState({
        waiting: false
      });
    }, 3000);
  }

  tick = () => this.setState({ waiting: true });

  onCancel = (e) => {
    this.setState({
      confirming: false,
      waiting: false
    });
    e.preventDefault();
    return false;
  }

  getContractHash = debounce((value) => {
    const { actions } = this.props;

    actions.getContractHash(value);
  }, 400)

  onChange = (e, { name, value, valid }) => {
    if (name === 'to') {
      const {
        actions,
        settings
      } = this.props;
      const {
        contacts
      } = settings;

      const position = findIndex(contacts, { accountName: value });

      if (position > -1) {
        this.onChange(e, { name: 'memo', value: contacts[position].defaultMemo || '', valid: true });
      }

      this.getContractHash(value);
    }


    const newState = { [name]: value };
    if (name === 'quantity') {
      const [, asset] = value.split(' ');
      newState.asset = asset;
    }

    newState[`${name}Valid`] = valid;

    newState.submitDisabled = false;
    newState.formError = false;

    this.setState(newState, () => {
      const error = this.errorInForm();

      if (error) {
        this.onError(error);
      }
    });
  }

  onError = (error) => {
    let formError;

    if (error !== true) {
      formError = error;
    }

    this.setState({
      formError,
      submitDisabled: true
    });
  }

  onBack = () => {
    this.setState({
      confirming: false
    });
  }

  errorInForm = () => {
    const {
      memo,
      memoValid,
      quantity,
      to,
      toValid
    } = this.state;

    const {
      app,
      connection: { chainId },
      settings
    } = this.props;

    if (!to || to === '') {
      return true;
    }

    if (!quantity || quantity === '' || quantity === '0.0000') {
      return true;
    }

    if (!toValid) {
      return 'invalid_accountName';
    }

    if (!memoValid) {
      return 'invalid_memo';
    }

    if (to === settings.account) {
      return 'cannot_transfer_to_self';
    }
    const exchangeAccounts = get(app, 'constants.exchanges') || [];
    if (exchangeAccounts.includes(to) && (!memo || memo.length === 0)) {
      return 'transferring_to_exchange_without_memo';
    }

    return false;
  }

  render() {
    const {
      app,
      balances,
      connection,
      onClose,
      settings,
      system,
      t
    } = this.props;
    const {
      asset,
      confirming,
      formError,
      from,
      memo,
      quantity,
      submitDisabled,
      to,
      waiting,
      waitingStarted
    } = this.state;

    const balance = balances[settings.account];

    let exchangeWarning;

    const exchangeAccounts = get(app, 'constants.exchanges') || [];

    if (memo && memo !== '') {
      exchangeAccounts(connection.chainId).forEach((exchangeAccount) => {
        if (memo.match(`.*?${exchangeAccount}.*?`)) {
          exchangeWarning = (
            <Message warning>
              {`${t('transfer_send_exchange_in_memo_one')} ${exchangeAccount} ${t('transfer_send_exchange_in_memo_two')}`}
            </Message>
          );
        }
      });
    }

    const shouldDisplayTransferingToContractMessage =
      to &&
      system.ACCOUNT_HAS_CONTRACT_LAST_ACCOUNT === to &&
      system.ACCOUNT_HAS_CONTRACT_LAST_CONTRACT_HASH &&
      system.ACCOUNT_HAS_CONTRACT_LAST_CONTRACT_HASH !== '0000000000000000000000000000000000000000000000000000000000000000';

    const hasWarnings = exchangeWarning || shouldDisplayTransferingToContractMessage;
    return (
      <Form
        loading={system.TRANSFER === 'PENDING'}
        onKeyPress={this.onKeyPress}
        onSubmit={this.onSubmit}
        warning={hasWarnings}
      >
        {(confirming)
          ? (
            <WalletPanelFormTransferSendConfirming
              asset={asset}
              balances={balances}
              from={from}
              memo={memo}
              onBack={this.onBack}
              onConfirm={this.onConfirm}
              quantity={quantity}
              to={to}
              waiting={waiting}
              waitingStarted={waitingStarted}
            />
          ) : (
            <Segment basic clearing>
              <GlobalFormFieldAccount
                app={app}
                autoFocus
                contacts={settings.contacts}
                enableContacts
                enableExchanges
                chainId={connection.chainId}
                fluid
                label={t('transfer_label_to')}
                name="to"
                onChange={this.onChange}
                value={to}
              />
              {(shouldDisplayTransferingToContractMessage) && (
                <Message
                  content={t('transfer_destination_account_is_contract')}
                  icon="warning sign"
                  warning
                />
              )}
              <FormFieldMultiToken
                balances={balances}
                connection={connection}
                icon="x"
                label={t('transfer_label_token_and_quantity')}
                loading={false}
                maximum={balance[asset]}
                name="quantity"
                onChange={this.onChange}
                settings={settings}
                value={quantity}
              />
              <p>
                {(balance[asset] && balance[asset].toFixed(4)) || '0.0000'}
                &nbsp;
                {asset}
                &nbsp;
                {t('transfer_header_available')}
              </p>
              <GlobalFormFieldMemo
                icon="x"
                label={t('transfer_label_memo')}
                loading={false}
                name="memo"
                onChange={this.onChange}
                value={memo}
              />

              <FormMessageError
                error={formError}
              />

              { exchangeWarning }

              <Divider />
              <Button
                content={t('confirm')}
                disabled={submitDisabled}
                floated="right"
                primary
              />
              <Button
                onClick={onClose}
              >
                <Icon name="x" /> {t('cancel')}
              </Button>
            </Segment>
          )}
      </Form>
    );
  }
}

export default translate('transfer')(WalletPanelFormTransferSend);
