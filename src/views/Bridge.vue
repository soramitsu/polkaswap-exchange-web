<template>
  <div v-loading="parentLoading" class="bridge s-flex">
    <s-form
      v-model="amounts"
      class="bridge-form"
      :show-message="false"
    >
      <s-card class="bridge-content" border-radius="medium" shadow="never">
        <generic-page-header class="header--bridge" :title="t('bridge.title')" :tooltip="t('bridge.info')" :tooltip-placement="'bottom'" :has-button-history="areNetworksConnected" />
        <s-card :class="isSoraToEthereum ? 'bridge-item' : 'bridge-item bridge-item--ethereum'" border-radius="mini" shadow="never">
          <div class="bridge-item-header">
            <div class="bridge-item-title">
              <span class="bridge-item-title-label">{{ t('bridge.from') }}</span>
              <span>{{ getBridgeItemTitle() }}</span>
              <token-logo class="bridge-item-title-icon" :tokenSymbol="isSoraToEthereum ? 'bridge-item-xor' : 'bridge-item-eth'" size="mini" />
            </div>
            <div v-if="isNetworkAConnected && isAssetSelected" class="asset-balance">
              <span class="asset-balance-title">{{ t('bridge.balance') }}</span>
              <span class="asset-balance-value">{{ formatBalance(isSoraToEthereum) }}</span>
            </div>
          </div>
          <div class="bridge-item-content">
            <s-form-item>
              <s-input
                v-model="amounts.a"
                v-float
                :class="inputClasses"
                :placeholder="isFieldAmountFocused ? '' : inputPlaceholder"
                :disabled="!areNetworksConnected || !isAssetSelected"
                @input="handleInputAmount"
                @focus="handleFocus"
                @blur="handleBlur"
              />
            </s-form-item>
            <div v-if="isNetworkAConnected && isAssetSelected" class="asset">
              <!-- TODO: Do we have a Max button for Ethereum network? If so, check all Ethereum Max functionality -->
              <s-button v-if="isMaxAvailable" class="s-button--max" type="tertiary" size="small" border-radius="mini" @click="handleMaxValue">
                {{ t('bridge.max') }}
              </s-button>
              <s-button class="s-button--choose-token" type="tertiary" size="small" border-radius="medium" icon="chevron-bottom-rounded" icon-position="right" @click="openSelectAssetDialog">
                <token-logo :tokenSymbol="asset.symbol" size="small" />
                {{ formatAssetSymbol(asset.symbol, !isSoraToEthereum) }}
              </s-button>
            </div>
            <s-button v-else class="s-button--empty-token" type="tertiary" size="small" border-radius="medium" icon="chevron-bottom-rounded" icon-position="right" :disabled="!areNetworksConnected" @click="openSelectAssetDialog">
              {{ t('bridge.chooseToken') }}
            </s-button>
          </div>
          <div v-if="isNetworkAConnected && !isSoraToEthereum" class="bridge-item-footer">
            <s-divider />
            <s-button class="s-button--change-wallet" type="link" size="mini" @click="isSoraToEthereum ? connectInternalWallet() : changeExternalWallet()">
              <span class="bridge-item-id">{{ formatAddress(isSoraToEthereum ? getWalletAddress() : ethAddress, 8) }}</span>
              <span class="change-wallet">{{ t('bridge.changeWallet') }}</span>
            </s-button>
            <span>{{ t('bridge.connected') }}</span>
          </div>
          <s-button v-else-if="!isNetworkAConnected" class="s-button--connect" type="primary" @click="isSoraToEthereum ? connectInternalWallet() : connectExternalWallet()">
            {{ t('bridge.connectWallet') }}
          </s-button>
        </s-card>
        <s-button class="s-button--switch" type="action" icon="change-positions" @click="handleSwitchItems" />
        <s-card :class="!isSoraToEthereum ? 'bridge-item' : 'bridge-item bridge-item--ethereum'" border-radius="mini" shadow="never">
          <div class="bridge-item-header">
            <div class="bridge-item-title">
              <span class="bridge-item-title-label">{{ t('bridge.to') }}</span>
              <span>{{ getBridgeItemTitle(true) }}</span>
              <token-logo class="bridge-item-title-icon" :tokenSymbol="isSoraToEthereum ? 'bridge-item-eth' : 'bridge-item-xor'" size="mini" />
            </div>
            <div v-if="areNetworksConnected && isAssetSelected" class="asset-balance">
              <span class="asset-balance-title">{{ t('bridge.balance') }}</span>
              <span class="asset-balance-value">{{ formatBalance(!isSoraToEthereum) }}</span>
            </div>
          </div>
          <div class="bridge-item-content">
            <s-form-item>
              <s-input
                v-float
                v-model="amounts.b"
                :class="inputClasses"
                :placeholder="inputPlaceholder"
                disabled
              />
            </s-form-item>
            <div v-if="areNetworksConnected && isAssetSelected" class="asset">
              <s-button class="s-button--choose-token" type="tertiary" size="small" border-radius="medium" disabled>
                <token-logo :tokenSymbol="asset.symbol" size="small" />
                {{ formatAssetSymbol(asset.symbol, isSoraToEthereum) }}
              </s-button>
            </div>
          </div>
          <div v-if="isNetworkBConnected && isSoraToEthereum" class="bridge-item-footer">
            <s-divider />
            <s-button class="s-button--change-wallet" type="link" size="mini" @click="!isSoraToEthereum ? connectInternalWallet() : changeExternalWallet()">
              <span class="bridge-item-id">{{ formatAddress(isSoraToEthereum ? ethAddress : getWalletAddress(), 8) }}</span>
              <span class="change-wallet">{{ t('bridge.changeWallet') }}</span>
            </s-button>
            <span>{{ t('bridge.connected') }}</span>
          </div>
          <s-button v-else-if="!isNetworkBConnected" class="s-button--connect" type="primary" @click="!isSoraToEthereum ? connectInternalWallet() : connectExternalWallet()">
            {{ t('bridge.connectWallet') }}
          </s-button>
        </s-card>
        <s-button
          class="s-button--next"
          type="primary"
          :disabled="!areNetworksConnected || !isValidEthNetwork || !isAssetSelected || isZeroAmount || isInsufficientXorForFee || isInsufficientEtherForFee || isInsufficientBalance || !isRegisteredAsset"
          @click="handleConfirmTransaction"
        >
          <template v-if="!areNetworksConnected">
            {{ t('bridge.connectWallet') }}
          </template>
          <template v-else-if="!isValidEthNetwork">
            {{ t('bridge.changeNetwork') }}
          </template>
          <template v-else-if="isZeroAmount">
            {{ t('bridge.enterAnAmount') }}
          </template>
          <template v-else-if="!isRegisteredAsset">
            {{ t('bridge.notRegisteredAsset', { assetSymbol : asset ? asset.symbol : '' }) }}
          </template>
          <template v-else-if="isInsufficientBalance">
            {{ t('confirmBridgeTransactionDialog.insufficientBalance', { assetSymbol : insufficientBalanceAssetSymbol }) }}
          </template>
          <template v-else-if="isInsufficientXorForFee">
            {{ t('confirmBridgeTransactionDialog.insufficientBalance', { assetSymbol : KnownSymbols.XOR }) }}
          </template>
          <template v-else-if="isInsufficientEtherForFee">
            {{ t('confirmBridgeTransactionDialog.insufficientBalance', { assetSymbol : EthSymbol }) }}
          </template>
          <template v-else>
            {{ t('bridge.next') }}
          </template>
        </s-button>
        <div v-if="areNetworksConnected && !isZeroAmount && isRegisteredAsset" class="info-line-container">
          <info-line
            :label="t('bridge.soraNetworkFee')"
            :tooltip-content="t('bridge.tooltipValue')"
            :value="soraNetworkFee ? '~' + formattedSoraNetworkFee : '-'"
            :asset-symbol="KnownSymbols.XOR"
          />
          <info-line
            :label="t('bridge.ethereumNetworkFee')"
            :tooltip-content="t('bridge.tooltipValue')"
            :value="ethereumNetworkFee ? '~' + ethereumNetworkFee : '-'"
            :asset-symbol="EthSymbol"
          />
          <!-- TODO: We don't need this block right now. How we should calculate the total? What for a case with not XOR asset (We can't just add it to soraNetworkFee as usual)? -->
          <!-- <info-line
            :label="t('bridge.total')"
            :tooltip-content="t('bridge.tooltipValue')"
            :value="`~${soraTotal}`"
            :asset-symbol="KnownSymbols.XOR"
          /> -->
        </div>
      </s-card>
      <select-registered-asset :visible.sync="showSelectTokenDialog" :asset="asset" @select="selectAsset" />
      <confirm-bridge-transaction-dialog :visible.sync="showConfirmTransactionDialog" :isInsufficientBalance="isInsufficientBalance" @confirm="confirmTransaction" />
    </s-form>
    <div v-if="!areNetworksConnected" class="bridge-footer">{{ t('bridge.connectWallets') }}</div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Action, Getter, State } from 'vuex-class'
import { AccountAsset, KnownSymbols, FPNumber, CodecString } from '@sora-substrate/util'

import NetworkFormatterMixin from '@/components/mixins/NetworkFormatterMixin'
import TranslationMixin from '@/components/mixins/TranslationMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'
import InputFormatterMixin from '@/components/mixins/InputFormatterMixin'
import NumberFormatterMixin from '@/components/mixins/NumberFormatterMixin'
import router, { lazyComponent } from '@/router'
import { Components, PageNames, EthSymbol, ZeroStringValue } from '@/consts'
import web3Util, { Provider } from '@/utils/web3-util'
import { RegisteredAccountAsset } from '@/store/assets'
import { getWalletAddress, isWalletConnected, isNumberValue, formatAddress, isXorAccountAsset, formatAssetSymbol } from '@/utils'

const namespace = 'bridge'

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    TokenLogo: lazyComponent(Components.TokenLogo),
    InfoLine: lazyComponent(Components.InfoLine),
    SelectRegisteredAsset: lazyComponent(Components.SelectRegisteredAsset),
    ConfirmBridgeTransactionDialog: lazyComponent(Components.ConfirmBridgeTransactionDialog)
  }
})
export default class Bridge extends Mixins(
  TranslationMixin,
  LoadingMixin,
  InputFormatterMixin,
  NetworkFormatterMixin,
  NumberFormatterMixin
) {
  @State(state => state.web3.ethAddress) ethAddress!: string

  @Action('getEthBalance', { namespace: 'web3' }) getEthBalance!: () => Promise<void>
  @Action('connectEthWallet', { namespace: 'web3' }) connectEthWallet!: (options) => Promise<void>
  @Action('switchEthAccount', { namespace: 'web3' }) switchEthAccount!: (address) => Promise<void>
  @Action('setEthNetwork', { namespace: 'web3' }) setEthNetwork!: (network?: string) => Promise<void>
  @Action('disconnectEthWallet', { namespace: 'web3' }) disconnectEthWallet!: () => Promise<void>
  @Action('setSoraToEthereum', { namespace }) setSoraToEthereum
  @Action('setAsset', { namespace }) setAsset
  @Action('setAmount', { namespace }) setAmount
  @Action('resetBridgeForm', { namespace }) resetBridgeForm
  @Action('getNetworkFee', { namespace }) getNetworkFee
  @Action('getEthNetworkFee', { namespace }) getEthNetworkFee
  @Action('getRegisteredAssets', { namespace: 'assets' }) getRegisteredAssets
  @Action('updateRegisteredAssetsExternalBalance', { namespace: 'assets' }) updateRegisteredAssetsExternalBalance

  @Getter('ethBalance', { namespace: 'web3' }) ethBalance!: string | number
  @Getter('isTransactionConfirmed', { namespace }) isTransactionConfirmed!: boolean
  @Getter('isValidEthNetwork', { namespace: 'web3' }) isValidEthNetwork!: boolean
  @Getter('isSoraToEthereum', { namespace }) isSoraToEthereum!: boolean
  @Getter('accountAssets', { namespace: 'assets' }) accountAssets!: Array<AccountAsset>
  @Getter('registeredAssets', { namespace: 'assets' }) registeredAssets!: Array<RegisteredAccountAsset>
  @Getter('asset', { namespace }) asset!: any
  @Getter('xorAsset', { namespace: 'assets' }) xorAsset!: any
  @Getter('amount', { namespace }) amount!: string | number
  @Getter('soraNetworkFee', { namespace }) soraNetworkFee!: CodecString
  @Getter('ethereumNetworkFee', { namespace }) ethereumNetworkFee!: string | number

  @Prop({ type: Boolean, default: false }) readonly parentLoading!: boolean

  EthSymbol = EthSymbol
  KnownSymbols = KnownSymbols
  formatAssetSymbol = formatAssetSymbol
  formatAddress = formatAddress
  getWalletAddress = getWalletAddress
  isWalletConnected = isWalletConnected

  isMetamaskConnecting = false
  inputPlaceholder = ZeroStringValue
  isFieldAmountFocused = false
  insufficientBalanceAssetSymbol = ''
  showSelectTokenDialog = false
  showConfirmTransactionDialog = false
  amounts = {
    a: '',
    b: ''
  }

  blockHeadersSubscriber

  get isEthereumNetworkConnected (): boolean {
    return !!this.ethAddress && this.ethAddress !== 'undefined'
  }

  get isNetworkAConnected () {
    return this.isSoraToEthereum ? !!this.isWalletConnected() : this.isEthereumNetworkConnected
  }

  get isNetworkBConnected () {
    return this.isSoraToEthereum ? this.isEthereumNetworkConnected : !!this.isWalletConnected()
  }

  get areNetworksConnected () {
    return this.isNetworkAConnected && this.isNetworkBConnected
  }

  get isZeroAmount (): boolean {
    return +this.amounts.a === 0
  }

  get isMaxAvailable (): boolean {
    if (!this.areNetworksConnected || !this.isRegisteredAsset) {
      return false
    }
    if (!this.asset || +this.asset[this.balanceSymbol] === 0) {
      return false
    }
    const decimals = this.asset.decimals
    const fpBalance = new FPNumber(this.asset[this.balanceSymbol], decimals)
    const fpAmount = new FPNumber(this.amount, decimals)
    // TODO: Check if we have appropriate network fee currency (XOR/ETH) for both networks
    if (isXorAccountAsset(this.asset) && this.isSoraToEthereum) {
      if (+this.soraNetworkFee === 0) {
        return false
      }
      const fpFee = new FPNumber(this.soraNetworkFee, decimals)
      return !FPNumber.eq(fpFee, fpBalance.sub(fpAmount)) && FPNumber.gt(fpBalance, fpFee)
    }
    return !FPNumber.eq(fpBalance, fpAmount)
  }

  get isInsufficientXorForFee (): boolean {
    if (!this.xorAsset) return true

    const fpBalance = new FPNumber(this.xorAsset.balance, this.xorAsset.decimals)
    const fpFee = new FPNumber(this.soraNetworkFee, this.xorAsset.decimals)

    return FPNumber.lt(fpBalance, fpFee)
  }

  get isInsufficientEtherForFee (): boolean {
    if (!this.isEthereumNetworkConnected) return true

    const fpBalance = new FPNumber(this.ethBalance)
    const fpFee = new FPNumber(this.ethereumNetworkFee)

    return FPNumber.lt(fpBalance, fpFee)
  }

  get isInsufficientBalance (): boolean {
    if (this.isNetworkAConnected && this.isRegisteredAsset) {
      const fpAmount = new FPNumber(this.amounts.a, this.asset.decimals)

      let fpBalance = new FPNumber(this.asset[this.balanceSymbol], this.asset.decimals)

      if (isXorAccountAsset(this.asset) && this.isSoraToEthereum) {
        const fpFee = new FPNumber(this.soraNetworkFee, this.asset.decimals)
        fpBalance = fpBalance.sub(fpFee)
      }

      if (FPNumber.lt(fpBalance, fpAmount)) {
        this.insufficientBalanceAssetSymbol = this.asset ? formatAssetSymbol(this.asset.symbol, !this.isSoraToEthereum) : ''
        return true
      }
    }
    return false
  }

  get inputClasses (): string {
    const inputClass = 's-input-amount'
    const classes = [inputClass]

    if (!this.isZeroAmount) {
      classes.push(`${inputClass}--filled`)
    }

    return classes.join(' ')
  }

  get isAssetSelected (): boolean {
    return !!this.asset
  }

  get balanceSymbol (): string {
    return this.isSoraToEthereum ? 'balance' : 'externalBalance'
  }

  get isRegisteredAsset (): boolean {
    if (this.asset) {
      return this.registeredAssets?.length ? !!this.registeredAssets.find(item => item.symbol === this.asset?.symbol) : false
    }
    return false
  }

  get formattedSoraNetworkFee (): string {
    return this.formatCodecNumber(this.soraNetworkFee)
  }

  formatBalance (isSora = true): string {
    if (!this.isRegisteredAsset) {
      return '-'
    }
    const balance = this.asset[isSora ? 'balance' : 'externalBalance']
    if (!balance) {
      return '-'
    }
    const decimals = isSora ? this.asset.decimals : undefined
    return this.formatCodecNumber(balance, decimals)
  }

  formatAssetValue (assetSymbol: string, amount: number | string): string {
    return `${amount} ${assetSymbol}`
  }

  created (): void {
    this.withApi(async () => {
      await this.getNetworkFee()
      await this.getEthNetworkFee()
    })
  }

  async mounted (): Promise<void> {
    this.setEthNetwork()
    this.getEthBalance()
    web3Util.watchEthereum({
      onAccountChange: (addressList: string[]) => {
        if (addressList.length) {
          this.switchEthAccount({ address: addressList[0] })
        } else {
          this.disconnectEthWallet()
        }
      },
      onNetworkChange: (networkId: string) => {
        this.setEthNetwork(networkId)
        this.getEthNetworkFee()
        this.getRegisteredAssets()
      },
      onDisconnect: (code: number, reason: string) => {
        this.disconnectEthWallet()
      }
    })
    this.resetBridgeForm()
    this.subscribeToEthBlockHeaders()
  }

  destroyed (): void {
    if (this.blockHeadersSubscriber) {
      this.blockHeadersSubscriber.unsubscribe()
    }
  }

  connectInternalWallet (): void {
    router.push({ name: PageNames.Wallet })
  }

  async subscribeToEthBlockHeaders (): Promise<void> {
    try {
      const web3 = await web3Util.getInstance()

      this.blockHeadersSubscriber = web3.eth.subscribe('newBlockHeaders', (error) => {
        if (!error) {
          this.getEthBalance()
          this.updateRegisteredAssetsExternalBalance()
        }
      })
    } catch (error) {
      console.error(error)
    }
  }

  async connectExternalWallet (): Promise<void> {
    // For now it's only Metamask
    if (this.isMetamaskConnecting) {
      return
    }
    this.isMetamaskConnecting = true
    try {
      await this.connectEthWallet({ provider: Provider.Metamask })
    } catch (error) {
      const provider = this.t(error.message)
      this.$alert(this.t('bridge.walletProviderConnectionError', { provider }))
    } finally {
      this.isMetamaskConnecting = false
    }
  }

  // TODO: Check why we can't choose another account
  async changeExternalWallet (): Promise<void> {
    // For now it's only Metamask
    if (this.isMetamaskConnecting) {
      return
    }
    this.isMetamaskConnecting = true
    try {
      await this.switchEthAccount({ provider: Provider.Metamask })
    } catch (error) {
      console.error(error)
    } finally {
      this.isMetamaskConnecting = false
    }
  }

  getBridgeItemTitle (isBTitle = false): string {
    if (this.isSoraToEthereum) {
      return this.t(this.formatNetwork(!isBTitle))
    }
    return this.t(this.formatNetwork(isBTitle))
  }

  resetFieldA (): void {
    this.amounts.a = ''
  }

  async handleInputAmount (): Promise<any> {
    this.amounts.a = this.formatNumberField(this.amounts.a)
    if (!isNumberValue(this.amounts.a)) {
      await this.promiseTimeout()
      this.resetFieldA()
      return
    }
    this.amounts.b = this.amounts.a
    this.setAmount(this.amounts.a)
    // TODO: only one time
    if (this.isRegisteredAsset) {
      this.getNetworkFee()
      this.getEthNetworkFee()
    }
    // TODO: Add input functionality here
  }

  handleBlur (): void {
    if (this.amounts.a === '' || this.isZeroAmount) {
      this.resetFieldA()
    } else {
      this.amounts.a = this.trimNeedlesSymbols(this.amounts.a)
    }
    this.isFieldAmountFocused = false
  }

  handleFocus (): void {
    this.isFieldAmountFocused = true
    if (this.isZeroAmount) {
      this.amounts.a = ''
    }
  }

  handleSwitchItems (): void {
    this.setSoraToEthereum(!this.isSoraToEthereum)
    if (this.isRegisteredAsset) {
      this.getNetworkFee()
      this.getEthNetworkFee()
    }
  }

  handleMaxValue (): void {
    if (this.asset && this.isRegisteredAsset) {
      if (isXorAccountAsset(this.asset) && this.isSoraToEthereum) {
        const decimals = this.asset.decimals
        const fpBalance = new FPNumber(this.asset[this.balanceSymbol], decimals)
        const fpFee = new FPNumber(this.soraNetworkFee, decimals)
        this.amounts.a = fpBalance.sub(fpFee).toString()
        return
      }
      this.amounts.a = this.asset[this.balanceSymbol].toString()
    }
    // TODO: Check balance (ETH)
  }

  handleConfirmTransaction (): void {
    this.showConfirmTransactionDialog = true
  }

  handleViewTransactionsHistory (): void {
    router.push({ name: PageNames.BridgeTransactionsHistory })
  }

  openSelectAssetDialog (): void {
    this.showSelectTokenDialog = true
  }

  async selectAsset (selectedAsset: any): Promise<void> {
    if (selectedAsset) {
      const registeredAsset = this.registeredAssets.find(asset => selectedAsset.symbol === asset.symbol)
      await this.setAsset(registeredAsset ?? selectedAsset)
      // TODO: Check SORA balance changing
      if (this.isRegisteredAsset) {
        this.getNetworkFee()
        this.getEthNetworkFee()
      }
    }
  }

  confirmTransaction (isTransactionConfirmed: boolean) {
    if (isTransactionConfirmed) {
      router.push({ name: PageNames.BridgeTransaction })
    }
  }
}
</script>

<style lang="scss">
$bridge-input-class: ".el-input";
$bridge-input-color: var(--s-color-base-content-tertiary);

.bridge {
  &-content > .el-card__body {
    padding: $inner-spacing-medium $inner-spacing-medium $inner-spacing-big;
  }
  .bridge-item {
    &--ethereum {
      .s-input {
        .el-input > input {
          // TODO: remove user select
          cursor: initial;
        }
      }
    }
    > .el-card__body {
      padding: 0;
    }
  }
  .s-button--switch {
    @include switch-button-inherit-styles('medium');
  }
  &-form {
    @include bridge-container;
    .s-input.s-input-amount {
      position: relative;
      &--filled {
        &:not(.s-disabled) {
          color: var(--s-color-base-content-primary);
        }
        &.s-disabled {
          color: $bridge-input-color;
        }
      }
      #{$bridge-input-class} {
        #{$bridge-input-class}__inner {
          padding-top: 0;
          @include text-ellipsis;
        }
      }
      #{$bridge-input-class}__inner {
        padding-right: 0;
        padding-left: 0;
        border-radius: 0 !important;
        color: inherit;
        @include input-font-styles;
        &, &:hover, &:focus {
          background-color: transparent;
          border-color: transparent;
        }
        &:disabled {
          color: var(--s-color-base-content-tertiary);
        }
        &:not(:disabled) {
          &:hover, &:focus {
            color: var(--s-color-base-content-primary);
          }
        }
        &::placeholder {
          color: var(--s-color-base-content-tertiary);
        }
      }
      .s-placeholder {
        display: none;
      }
    }
    .s-button {
      // TODO: Check all icons settings after fix in UI Lib
      &--max,
      &--choose-token,
      &--empty-token {
        font-feature-settings: $s-font-feature-settings-title;
        > span {
          display: inline-flex;
          align-items: center;
          > i[class^=s-icon-] {
            font-size: var(--s-icon-font-size-medium);
          }
        }
      }
      &--empty-token {
        > span {
          > i[class^=s-icon-] {
            margin-left: $inner-spacing-mini / 2 !important;
          }
        }
      }
      &--choose-token {
        > span {
          > i[class^=s-icon-] {
            margin-left: $inner-spacing-mini !important;
          }
        }
      }
    }
  }
}
</style>

<style lang="scss" scoped>
.bridge {
  flex-direction: column;
  align-items: center;
  &-content {
    @include bridge-content;
  }
  @include token-styles;
  @include vertical-divider('s-button--switch', $inner-spacing-medium);
  .s-button--switch {
    @include switch-button(var(--s-size-medium));
  }
  .bridge-item {
    margin-bottom: $inner-spacing-mini;
    background-color: var(--s-color-base-background);
    &,
    &:hover {
      border: none;
    }
    &-header,
    &-footer {
      padding-top: $inner-spacing-mini / 2;
      padding-right: $inner-spacing-medium;
      padding-left: $inner-spacing-medium;
      font-size: var(--s-font-size-mini);
      line-height: $s-line-height-big;
    }
    &-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: $inner-spacing-mini;
    }
    &-title,
    .s-button--change-wallet {
      margin-right: $inner-spacing-medium;
    }
    &-title {
      display: flex;
      flex-wrap: nowrap;
      align-items: center;
      &-label {
        margin-right: $inner-spacing-mini / 2;
        & + span {
          color: var(--s-color-base-content-tertiary);
          white-space: nowrap;
        }
      }
      &-icon {
        margin-left: $inner-spacing-mini / 2;
        display: block;
        border: none;
        box-shadow: none;
      }
    }
    &-content {
      margin-bottom: $inner-spacing-mini;
      display: flex;
      justify-content: space-between;
      padding-right: $inner-spacing-small;
      padding-left: $inner-spacing-medium;
    }
    &--ethereum {
      .el-button {
        @include ethereum-logo-styles;
      }
      .s-button--choose-token {
        cursor: initial;
      }
    }
    .el-form-item {
      margin-bottom: 0;
      margin-right: $inner-spacing-mini;
      width: 100%;
    }
    .s-input {
      min-height: 0;
      font-feature-settings: $s-font-feature-settings-title;
    }
    .asset {
      display: flex;
      align-items: center;
      &-logo {
        margin-right: $inner-spacing-mini;
      }
    }
    &-footer {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      padding-bottom: $inner-spacing-mini;
      background-color: var(--s-color-base-background);
      color: var(--s-color-base-content-secondary);
      .el-divider {
        margin-top: 0;
        margin-bottom: $inner-spacing-mini;
        width: 100%;
        background-color: var(--s-color-base-border-primary);
      }
    }
    & + .bridge-info {
      margin-top: $basic-spacing * 2;
    }
  }
  .asset-balance {
    text-align: right;
    &-title {
      margin-right: $inner-spacing-mini / 2;
      color: var(--s-color-base-content-secondary);
    }
    &-value {
      word-break: break-all;
    }
  }
  .s-button--switch {
    margin-left: auto;
    margin-right: auto;
    display: block;
  }
  &-footer {
    display: flex;
    align-items: center;
    font-size: var(--s-font-size-mini);
    line-height: $s-line-height-big;
    color: var(--s-color-base-content-secondary);
    font-feature-settings: $s-font-feature-settings-common;
  }
  .s-tertiary {
    padding: $inner-spacing-mini / 2 $inner-spacing-mini / 2 $inner-spacing-mini / 2 $inner-spacing-mini;
  }
  @include buttons;
  .s-button {
    &--max,
    &--empty-token {
      margin-left: $inner-spacing-mini / 2;
    }
    &--max {
      margin-right: $inner-spacing-mini / 2;
      padding-right: $inner-spacing-mini;
      height: var(--s-size-mini);
    }
    &--empty-token {
      @include font-weight(600, true);
      background-color: var(--s-color-base-background);
      border-color: var(--s-color-base-background);
      &:not(.is-disabled) {
        &, &:hover, &:active, &:focus {
          color: var(--s-color-base-content-primary);
        }
        &:hover, &:active, &:focus {
          background-color: var(--s-color-base-background-hover);
          border-color: var(--s-color-base-background-hover);
        }
      }
    }
    &--max,
    &--choose-token {
      @include font-weight(700, true);
    }
    &--choose-token {
      margin-left: 0;
      padding-left: $inner-spacing-mini / 2;
      background-color: transparent;
      border-color: transparent;
      color: var(--s-color-base-content-primary);
      font-size: var(--s-font-size-small);
      // TODO: check this styles
      &:hover, &:active, &:focus {
        background-color: var(--s-color-base-background-hover);
        border-color: var(--s-color-base-background-hover);
        color: var(--s-color-base-content-primary);
      }
      &.is-disabled {
        &:hover {
          background-color: transparent;
          border-color: transparent;
        }
      }
    }
    &--connect {
      margin: $inner-spacing-mini $inner-spacing-small $inner-spacing-small;
      width: calc(100% - #{$inner-spacing-small * 2});
    }
    &--change-wallet {
      padding: 0;
      color: inherit;
      font-size: inherit;
      line-height: inherit;
      .change-wallet {
        display: none;
      }
      &:hover {
        .bridge-item-id {
          display: none;
        }
        .change-wallet {
          display: inline-block;
          text-decoration: underline;
        }
      }
    }
    &--next {
      margin-top: $inner-spacing-mini;
      width: 100%;
    }
  }
  .info-line-container {
    border: 1px solid var(--s-color-base-border-secondary);
    border-radius: var(--s-border-radius-small);
    margin-top: $inner-spacing-medium;
    padding: $inner-spacing-mini / 2 $inner-spacing-mini;
  }
}
</style>