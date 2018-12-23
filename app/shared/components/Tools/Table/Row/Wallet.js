// @flow
import React, { Component } from 'react';
import { translate } from 'react-i18next';
import { find } from 'lodash';

import { Button, Dropdown, Header, Label, Popup, Table } from 'semantic-ui-react';

import GlobalAccountEdit from '../../../../containers/Global/Account/Edit';
import GlobalButtonElevate from '../../../../containers/Global/Button/Elevate';
import GlobalFragmentAuthorization from '../../../Global/Fragment/Authorization';
import GlobalFragmentBlockchain from '../../../Global/Fragment/Blockchain';
import GlobalFragmentWalletType from '../../../Global/Fragment/WalletType';
import GlobalButtonWalletUpgrade from '../../../../containers/Global/Button/Wallet/Upgrade';
import ENUAccount from '../../../../utils/ENU/Account';

const initialEditState = {
  editAccount: undefined,
  editAuthorization: undefined,
};

class ToolsTableRowWallet extends Component<Props> {
  constructor(props) {
    super(props);
    this.state = Object.assign(
      {},
      initialEditState,
    );
  }
  editWallet = (account, authorization) => {
    this.setState({
      editAccount: account,
      editAuthorization: authorization,
    });
  }
  removeWallet = (account, authorization) => {
    const { actions, settings } = this.props;
    actions.removeWallet(settings.chainId, account, authorization);
  }
  swapWallet = (account, authorization, password = false) => {
    const { actions, settings } = this.props;
    actions.useWallet(settings.chainId, account, authorization);
    if (password) {
      actions.unlockWallet(password);
    }
  }
  resetEditWallet = () => this.setState(Object.assign(
    this.state,
    initialEditState
  ));
  render() {
    const {
      current,
      blockchains,
      settings,
      status,
      t,
      validate,
      wallet,
    } = this.props;
    const {
      account,
      authorization,
      chainId,
      mode,
      pubkey
    } = wallet;
    const {
      accountData
    } = current;
    const blockchain = find(blockchains, { chainId });
    const data = new ENUAccount(accountData).getPermission(authorization);
    const {
      editAccount,
      editAuthorization,
    } = this.state;
    let modal;
    let color = 'grey';
    if (editAccount && editAuthorization) {
      modal = (
        <GlobalAccountEdit
          account={editAccount}
          authorization={editAuthorization}
          data={wallet}
          onClose={this.resetEditWallet}
        />
      )
    }
    const items = [
      (
        <Dropdown.Header icon="warning sign" content={t('wallet:wallet_advanced_header')} />
      ),
      (
        <Dropdown.Item
          content={t('wallet:view')}
          icon="edit"
          key="edit"
          onClick={() => this.editWallet(account, authorization)}
        />
      )
    ];
    // Is this the current wallet? Account + Authorization must match
    const isCurrentWallet = (
      account === current.account
      && authorization === current.authorization
    );

    let icon = 'disk';
    // Create delete button based on wallet
    switch (mode) {
      case 'watch': {
        color = 'grey';
        icon = 'eye';
        items.push((
          <Dropdown.Item
            content={t('wallet:wallet_remove')}
            disabled={isCurrentWallet}
            icon="trash"
            key="delete"
            onClick={() => this.removeWallet(account, authorization)}
          />
        ));
        break;
      }
      case 'cold': {
        color = 'blue';
        icon = 'snowflake';
        items.push((
          <Dropdown.Item
            content={t('wallet:wallet_remove')}
            disabled={isCurrentWallet}
            icon="trash"
            key="delete"
            onClick={() => this.removeWallet(account, authorization)}
          />
        ));
        break;
      }
      default: {
        color = 'green';
        icon = 'id card';
        items.push((
          <GlobalButtonElevate
            onSuccess={() => this.removeWallet(account, authorization)}
            settings={settings}
            trigger={(
              <Dropdown.Item
                disabled={isCurrentWallet}
                icon="trash"
                key="delete"
                text={t('wallet:wallet_remove')}
              />
            )}
            validate={validate}
            wallet={wallet}
          />
        ));
      }
    }
    return (
      <Table.Row key={`${account}-${authorization}`}>
        <Table.Cell collapsing>
          {modal}
          <Header>
            <GlobalFragmentAuthorization
              account={account}
              authorization={authorization}
              pubkey={pubkey}
            />
          </Header>
        </Table.Cell>
        <Table.Cell collapsing>
          {(blockchain)
            ? (
              <GlobalFragmentBlockchain
                blockchain={blockchain}
              />
            )
            : false
          }
        </Table.Cell>
        <Table.Cell>
          <GlobalFragmentWalletType
            mode={mode}
          />
        </Table.Cell>
        <Table.Cell collapsing textAlign="right">
          <GlobalButtonWalletUpgrade
            wallet={wallet}
          />
          {(mode === 'hot' || mode === 'cold')
            ? (
              <GlobalButtonElevate
                onSuccess={(password) => this.swapWallet(account, authorization, password)}
                settings={settings}
                trigger={(
                  <Button
                    color="green"
                    content={t('tools_wallets_swap')}
                    disabled={isCurrentWallet}
                    icon="random"
                  />
                )}
                validate={validate}
                wallet={wallet}
              />
            )
            : false
          }
          {(mode === 'watch')
            ? (
              <Button
                color="green"
                content={t('tools_wallets_swap')}
                disabled={isCurrentWallet}
                icon="random"
                onClick={() => this.swapWallet(account, authorization)}
              />
            )
            : false
          }
          <Dropdown
            direction="left"
            floating
            button
            className="icon"
            icon="ellipsis vertical"
          >
            <Dropdown.Menu>
              {items}
            </Dropdown.Menu>
          </Dropdown>
        </Table.Cell>
      </Table.Row>
    );
  }
}

export default translate('tools')(ToolsTableRowWallet);