// @flow
import React, { Component } from 'react';
import { translate } from 'react-i18next';
import debounce from 'lodash/debounce';
import { Segment, Form, Button, Message, Table } from 'semantic-ui-react';

import FormMessageError from '../../Global/Form/Message/Error';
import GlobalFormFieldString from '../../Global/Form/Field/String';
import GlobalFormFieldAmount from '../../Global/Form/Field/Token';
import ToolsFormBidNameConfirming from './BidName/Confirming';
import WalletPanelLocked from '../../Wallet/Panel/Locked';

const formAttributes = ['bidder', 'newname', 'bid'];
const tokenFields = ['bid'];

class ToolsFormBidName extends Component<Props> {
  constructor(props) {
    super(props);
    const {
      settings
    } = props;

    this.state = {
      confirming: false,
      formErrors: {},
      bidder: settings.account,
      submitDisabled: true
    };
  }

  onSubmit = (e) => {
    if (!this.state.submitDisabled) {
      this.setState({
        confirming: true
      });
    }

    e.preventDefault();
    return false;
  }

  onKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.onSubmit(e);

      e.preventDefault();
      return false;
    }
  }

  onChange = debounce((e, { name, value, valid }) => {
    this.setState({
      submitDisabled: false,
      [name]: value
    }, () => {
      const {
        formErrors,
        newname
      } = this.state;

      const {
        actions,
        balance
      } = this.props;

      const {
        checkAccountAvailability,
        getBidForName
      } = actions;

      if (name === 'newname' && newname.length !== 0) {
        checkAccountAvailability(newname);
        getBidForName(newname);
      }

      let submitDisabled = false;

      if (!valid) {
        formErrors[name] = `invalid_${name}`;
        submitDisabled = true;
      } else if (name === 'bid' && Number(value.split(' ')[0]) > balance.EOS) {
        formErrors[name] = 'not_enough_balance';
        submitDisabled = true;
      } else if (name === 'newname' && value.length > 11) {
        formErrors[name] = 'newname_too_long';
        submitDisabled = true;
      } else {
        formErrors[name] = null;
      }

      if (!this.allFieldsHaveValidFormat()) {
        submitDisabled = true;
      }

      this.setState({
        formErrors,
        submitDisabled
      });
    });
  }, 200)

  onToggle = (e, { name }) => {
    this.setState({
      [name]: !this.state[name]
    });
  }

  allFieldsHaveValidFormat = () => {
    const {
      formErrors
    } = this.state;

    let validFormat = true;

    formAttributes.forEach((attribute) => {
      if (formErrors[attribute] === `invalid_${attribute}` || !this.state[attribute]) {
        validFormat = false;
      }
    });

    return validFormat;
  }

  onBack = () => {
    this.setState({
      confirming: false
    });
  }

  onConfirm = () => {
    this.setState({
      confirming: false
    });

    const formValues = {};

    formAttributes.forEach((formAttribute) => {
      formValues[formAttribute] = this.state[formAttribute];
    });

    const {
      actions
    } = this.props;

    actions.bidname(formValues);
  }

  render() {
    const {
      actions,
      keys,
      settings,
      system,
      t,
      validate,
      wallet
    } = this.props;

    const {
      bid,
      formErrors,
      newname
    } = this.state;

    let {
      submitDisabled
    } = this.state;

    const shouldShowConfirm = this.state.confirming;
    const shouldShowForm = !shouldShowConfirm;
    const shouldShowBidInfo = system.NAMEBID_LAST_BID;

    const formErrorKeys = Object.keys(formErrors);

    if (newname &&
        newname.length !== 0 &&
        system.ACCOUNT_AVAILABLE === 'FAILURE' &&
        system.ACCOUNT_AVAILABLE_LAST_ACCOUNT === newname) {
      formErrors.accountName = 'account_name_not_available';
      submitDisabled = true;
    } else if (newname &&
               newname.length !== 0 &&
               system.NAMEBID_LAST_BID &&
               system.NAMEBID_LAST_BID.newname === newname &&
               system.NAMEBID_LAST_BID.owner === settings.account) {
      formErrors.accountName = 'account_name_already_bid';
      submitDisabled = true;
    } else if (['account_name_not_available', 'account_name_already_bid'].includes(formErrors.accountName)) {
      formErrors.accountName = null;
    }

    if (bid && newname &&
        system.NAMEBID_LAST_BID.newname === newname &&
        system.NAMEBID_LAST_BID.bid > bid) {
      formErrors.accountName = 'bid_too_low';
      submitDisabled = true;
    } else if (formErrors.bid === 'bid_too_low') {
      formErrors.bid = null;
    }

    return ((keys && keys.key) || settings.walletMode === 'watch')
      ? (
        <Segment
          loading={system.BIDNAME === 'PENDING'}
          textAlign="left"
        >
          {(shouldShowForm)
            ? (
              <div>
                <Message
                  content={t('tools_form_bid_name_message')}
                  warning
                />
                <Form
                  onKeyPress={this.onKeyPress}
                  onSubmit={this.onSubmit}
                >
                  {formAttributes.filter((formAttribute) => formAttribute !== 'bidder').map((formAttribute) => {
                    let FieldComponentType;
                    let defaultValue;

                    if (tokenFields.includes(formAttribute)) {
                      FieldComponentType = GlobalFormFieldAmount;
                      defaultValue = this.state[formAttribute] && this.state[formAttribute].split(' ')[0];
                    } else {
                      FieldComponentType = GlobalFormFieldString;
                      defaultValue = this.state[formAttribute];
                    }

                    return (
                      <FieldComponentType
                        defaultValue={defaultValue || ''}
                        label={t(`tools_form_bid_name_${formAttribute}`)}
                        name={formAttribute}
                        onChange={this.onChange}
                      />
                    );
                  })}
                  <FormMessageError
                    errors={
                      formErrorKeys.length > 0 && formErrorKeys.reduce((errors, key) => {
                        const error = this.state.formErrors[key];
                        if (error) {
                          errors.push(error);
                        }
                        return errors;
                      }, [])
                    }
                    icon="warning sign"
                  />
                  {(shouldShowBidInfo)
                  ? (
                    <Message
                      info
                    >
                      <Table size="small">
                        <Table.Row>
                          <Table.Cell>
                            {t('tools_form_bid_name_bid_info_last_bid')}
                          </Table.Cell>
                          <Table.Cell>
                            {system.NAMEBID_LAST_BID.high_bid}
                          </Table.Cell>
                        </Table.Row>
                        <Table.Row>
                          <Table.Cell>
                            {t('tools_form_bid_name_bid_info_last_bidder')}
                          </Table.Cell>
                          <Table.Cell>
                            {system.NAMEBID_LAST_BID.high_bidder}
                          </Table.Cell>
                        </Table.Row>
                      </Table>
                    </Message>
                  ) : ''}
                  <Segment basic clearing>
                    <Button
                      content={t('tools_form_proxy_info_button')}
                      color="green"
                      disabled={submitDisabled}
                      floated="right"
                      primary
                    />
                  </Segment>
                </Form>
              </div>
            ) : ''}

          {(shouldShowConfirm)
            ? (
              <ToolsFormBidNameConfirming
                formAttributes={formAttributes}
                formValues={this.state}
                onBack={this.onBack}
                onConfirm={this.onConfirm}
              />
            ) : ''}
        </Segment>
      ) : (
        <WalletPanelLocked
          actions={actions}
          settings={settings}
          validate={validate}
          wallet={wallet}
        />
      );
  }
}


export default translate('tools')(ToolsFormBidName);
