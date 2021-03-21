<template>
  <s-form v-loading="parentLoading" class="container el-form--actions" :show-message="false">
    <generic-page-header class="page-header--swap" :title="t('exchange.Swap')">
      <s-button
        class="el-button--settings"
        type="action"
        icon="basic-settings-24"
        size="medium"
        @click="openSettingsDialog"
      />
    </generic-page-header>
    <div class="input-container">
      <div class="input-line">
        <div class="input-title">
          <span>{{ t('exchange.from') }}</span>
          <span :class="`input-title-estimated ${(areTokensSelected && !isZeroToAmount && isExchangeB) ? 'input-title-estimated--show' : ''}`">
            ({{ t('swap.estimated') }})
          </span>
        </div>
        <div v-if="this.connected && this.tokenFrom && this.tokenFrom.balance" class="token-balance">
          <span class="token-balance-title">{{ t('exchange.balance') }}</span>
          <span class="token-balance-value">{{ formatBalance(tokenFrom) }}</span>
        </div>
      </div>
      <div class="input-line">
        <s-form-item>
          <s-float-input
            class="s-input--token-value"
            :decimals="tokenFrom && tokenFrom.decimals"
            :value="fromValue"
            @input="handleInputFieldFrom"
            @focus="handleFocusField(false)"
          />
        </s-form-item>
        <div v-if="tokenFrom" class="token">
          <s-button v-if="isMaxSwapAvailable" class="el-button--max" type="tertiary" size="small" border-radius="mini" @click="handleMaxValue">
            {{ t('exchange.max') }}
          </s-button>
          <s-button class="el-button--choose-token" type="tertiary" size="small" border-radius="medium" icon="chevron-down-rounded-16" icon-position="right" @click="openSelectTokenDialog(true)">
            <token-logo :token="tokenFrom" size="small" />
            {{ tokenFrom.symbol }}
          </s-button>
        </div>
        <s-button v-else class="el-button--empty-token" type="tertiary" size="small" border-radius="mini" icon="chevron-down-rounded-16" icon-position="right" @click="openSelectTokenDialog(true)">
          {{ t('exchange.chooseToken') }}
        </s-button>
      </div>
    </div>
    <s-button class="el-button--switch-tokens" type="action" icon="arrows-swap-90-24" :disabled="!areTokensSelected || isRecountingProcess" @click="handleSwitchTokens" />
    <div class="input-container">
      <div class="input-line">
        <div class="input-title">
          <span>{{ t('exchange.to') }}</span>
          <span :class="`input-title-estimated ${(areTokensSelected && !isZeroFromAmount && !isExchangeB) ? 'input-title-estimated--show' : ''}`">
            ({{ t('swap.estimated') }})
          </span>
        </div>
        <div v-if="this.connected && this.tokenTo && this.tokenTo.balance" class="token-balance">
          <span class="token-balance-title">{{ t('exchange.balance') }}</span>
          <span class="token-balance-value">{{ formatBalance(tokenTo) }}</span>
        </div>
      </div>
      <div class="input-line">
        <s-form-item>
          <s-float-input
            class="s-input--token-value"
            :value="toValue"
            :decimals="tokenTo && tokenTo.decimals"
            @input="handleInputFieldTo"
            @focus="handleFocusField(true)"
          />
        </s-form-item>
        <div v-if="tokenTo" class="token">
          <s-button class="el-button--choose-token" type="tertiary" size="small" border-radius="medium" icon="chevron-down-rounded-16" icon-position="right" @click="openSelectTokenDialog(false)">
            <token-logo :token="tokenTo" size="small" />
            {{ tokenTo.symbol }}
          </s-button>
        </div>
        <s-button v-else class="el-button--empty-token" type="tertiary" size="small" border-radius="mini" icon="chevron-down-rounded-16" icon-position="right" @click="openSelectTokenDialog(false)">
          {{ t('exchange.chooseToken') }}
        </s-button>
      </div>
    </div>
    <swap-info v-if="areTokensSelected && !areZeroAmounts" :show-price="true" :show-slippage-tolerance="true" />
    <s-button v-if="!connected" type="primary" @click="handleConnectWallet">
      {{ t('swap.connectWallet') }}
    </s-button>
    <s-button v-else type="primary" :disabled="!areTokensSelected || areZeroAmounts || isInsufficientAmount || isInsufficientBalance" @click="handleConfirmSwap">
      <template v-if="!areTokensSelected || (isZeroFromAmount && isZeroToAmount)">
        {{ t('exchange.enterAmount') }}
      </template>
      <template v-else-if="isInsufficientLiquidity">
        {{ t('swap.insufficientLiquidity') }}
      </template>
      <template v-else-if="isInsufficientAmount">
        {{ t('swap.insufficientAmount', { tokenSymbol: insufficientAmountTokenSymbol }) }}
      </template>
      <template v-else-if="isInsufficientBalance">
        {{ t('exchange.insufficientBalance', { tokenSymbol: insufficientBalanceTokenSymbol }) }}
      </template>
      <template v-else>
        {{ t('exchange.Swap') }}
      </template>
    </s-button>
    <swap-info v-if="areTokensSelected && !areZeroAmounts" />
    <select-token :visible.sync="showSelectTokenDialog" :connected="connected" :asset="isTokenFromSelected ? tokenTo : tokenFrom" @select="selectToken" />
    <confirm-swap :visible.sync="showConfirmSwapDialog" :isInsufficientBalance="isInsufficientBalance" @confirm="confirmSwap" @checkConfirm="updateAccountAssets" />
    <settings :visible.sync="showSettings" />
  </s-form>
</template>

<script lang="ts">
import { Component, Mixins, Watch, Prop } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import { api } from '@soramitsu/soraneo-wallet-web'
import { KnownAssets, KnownSymbols, FPNumber, CodecString, AccountAsset } from '@sora-substrate/util'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'
import NumberFormatterMixin from '@/components/mixins/NumberFormatterMixin'

import { isWalletConnected, isXorAccountAsset, isMaxButtonAvailable, getMaxValue } from '@/utils'
import router, { lazyComponent } from '@/router'
import { Components, PageNames } from '@/consts'

const namespace = 'swap'

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    Settings: lazyComponent(Components.Settings),
    SwapInfo: lazyComponent(Components.SwapInfo),
    TokenLogo: lazyComponent(Components.TokenLogo),
    SelectToken: lazyComponent(Components.SelectToken),
    ConfirmSwap: lazyComponent(Components.ConfirmSwap)
  }
})
export default class Swap extends Mixins(TranslationMixin, LoadingMixin, NumberFormatterMixin) {
  @Getter('tokenXOR', { namespace }) tokenXOR!: AccountAsset
  @Getter('tokenFrom', { namespace }) tokenFrom!: AccountAsset
  @Getter('tokenTo', { namespace }) tokenTo!: AccountAsset
  @Getter('fromValue', { namespace }) fromValue!: string
  @Getter('toValue', { namespace }) toValue!: string
  @Getter('isExchangeB', { namespace }) isExchangeB!: boolean
  @Getter('networkFee', { namespace }) networkFee!: CodecString
  @Getter('liquidityProviderFee', { namespace }) liquidityProviderFee!: CodecString

  @Action('setTokenFromAddress', { namespace }) setTokenFromAddress!: (address?: string) => Promise<void>
  @Action('setTokenToAddress', { namespace }) setTokenToAddress!: (address?: string) => Promise<void>
  @Action('setFromValue', { namespace }) setFromValue!: (value: string) => Promise<void>
  @Action('setToValue', { namespace }) setToValue!: (value: string) => Promise<void>
  @Action('setTokenFromPrice', { namespace }) setTokenFromPrice!: (isTokenFromPrice: boolean) => Promise<void>
  @Action('setMinMaxReceived', { namespace }) setMinMaxReceived!: (value: CodecString) => Promise<void>
  @Action('setExchangeB', { namespace }) setExchangeB!: (isExchangeB: boolean) => Promise<void>
  @Action('setLiquidityProviderFee', { namespace }) setLiquidityProviderFee!: (value: CodecString) => Promise<void>
  @Action('setNetworkFee', { namespace }) setNetworkFee!: (value: CodecString) => Promise<void>

  @Action('getPrices', { namespace: 'prices' }) getPrices!: (options: any) => Promise<void>
  @Action('resetPrices', { namespace: 'prices' }) resetPrices!: () => Promise<void>

  @Getter slippageTolerance!: number
  @Getter accountAssets!: Array<AccountAsset> // Wallet store

  @Watch('slippageTolerance')
  private handleSlippageToleranceChange (): void {
    this.calcMinMaxRecieved()
  }

  @Prop({ type: Boolean, default: false }) readonly parentLoading!: boolean

  isInsufficientAmount = false
  insufficientBalanceTokenSymbol = ''
  insufficientAmountTokenSymbol = ''
  isTokenFromSelected = false
  showSettings = false
  showSelectTokenDialog = false
  showConfirmSwapDialog = false
  isRecountingProcess = false

  get connected (): boolean {
    return isWalletConnected()
  }

  get areTokensSelected (): boolean {
    return !!(this.tokenFrom && this.tokenTo)
  }

  get isZeroFromAmount (): boolean {
    return this.isZeroValue(this.fromValue)
  }

  get isZeroToAmount (): boolean {
    return this.isZeroValue(this.toValue)
  }

  get areZeroAmounts (): boolean {
    return this.isZeroFromAmount || this.isZeroToAmount
  }

  get isMaxSwapAvailable (): boolean {
    return isMaxButtonAvailable(this.areTokensSelected, this.tokenFrom, this.fromValue, this.networkFee)
  }

  get isInsufficientLiquidity (): boolean {
    if (!(this.connected && this.areTokensSelected && !(this.isZeroFromAmount && this.isZeroToAmount))) {
      return false
    }
    return this.areZeroAmounts && +this.liquidityProviderFee === 0
  }

  get isInsufficientBalance (): boolean {
    if (this.connected && this.areTokensSelected) {
      let fpBalance = this.getFPNumberFromCodec(this.tokenFrom.balance, this.tokenFrom.decimals)
      const fpAmount = this.getFPNumber(this.fromValue, this.tokenFrom.decimals)
      if (FPNumber.lt(fpBalance, fpAmount)) {
        this.insufficientBalanceTokenSymbol = this.tokenFrom.symbol as string
        return true
      }
      const fpFee = this.getFPNumberFromCodec(this.networkFee, this.tokenFrom.decimals)
      this.insufficientBalanceTokenSymbol = KnownSymbols.XOR
      if (isXorAccountAsset(this.tokenFrom)) {
        return !(FPNumber.lt(fpFee, fpBalance.sub(fpAmount)) || FPNumber.eq(fpFee, fpBalance.sub(fpAmount)))
      }
      if (!this.tokenXOR) {
        return true
      }
      fpBalance = this.getFPNumberFromCodec(this.tokenXOR.balance, this.tokenXOR.decimals)
      return !(FPNumber.lt(fpFee, fpBalance) || FPNumber.eq(fpFee, fpBalance))
    }
    return false
  }

  created () {
    this.withApi(() => {
      if (!this.tokenFrom) {
        const xorAddress = KnownAssets.get(KnownSymbols.XOR)?.address
        this.setTokenFromAddress(xorAddress)
        this.setTokenToAddress()
      }
      if (this.tokenFrom && this.tokenTo) {
        this.getNetworkFee()
      }
    })
  }

  formatBalance (token): string {
    if (!token?.balance) {
      return ''
    }
    return this.formatCodecNumber(token.balance)
  }

  resetInsufficientAmountFlag (): void {
    this.isInsufficientAmount = false
  }

  resetFieldFrom (): void {
    this.setFromValue('')
  }

  resetFieldTo (): void {
    this.setToValue('')
  }

  async getNetworkFee (): Promise<void> {
    if (this.connected) {
      const networkFee = await api.getSwapNetworkFee(
        this.tokenFrom?.address,
        this.tokenTo?.address,
        this.fromValue,
        this.toValue,
        this.slippageTolerance,
        this.isExchangeB
      )
      this.setNetworkFee(networkFee)
    }
  }

  async handleInputFieldFrom (value): Promise<any> {
    if (!this.areTokensSelected || this.isZeroValue(value)) {
      this.resetFieldTo()
    }

    if (value !== this.fromValue) {
      this.setFromValue(value)
      await this.recountSwapValues()
    }
  }

  async handleInputFieldTo (value): Promise<any> {
    if (!this.areTokensSelected || this.isZeroValue(value)) {
      this.resetFieldFrom()
    }

    if (value !== this.toValue) {
      this.setToValue(value)
      await this.recountSwapValues()
    }
  }

  private async recountSwapValues (): Promise<void> {
    const value = this.isExchangeB ? this.toValue : this.fromValue
    const setOppositeValue = this.isExchangeB ? this.setFromValue : this.setToValue
    const resetOppositeValue = this.isExchangeB ? this.resetFieldFrom : this.resetFieldTo
    const token = this.isExchangeB ? this.tokenTo : this.tokenFrom

    if (!this.areTokensSelected || this.isZeroValue(value)) return

    try {
      this.isRecountingProcess = true
      this.resetInsufficientAmountFlag()

      const { amount, fee } = await api.getSwapResult(this.tokenFrom.address, this.tokenTo.address, value, this.isExchangeB)

      setOppositeValue(this.getStringFromCodec(amount, token.decimals))
      this.setLiquidityProviderFee(fee)

      await this.calcMinMaxRecieved()
      await this.updatePrices()
      await this.getNetworkFee()
    } catch (error) {
      resetOppositeValue()
      if (!this.isInsufficientAmountError(token.symbol as string, error.message)) {
        throw error
      }
    } finally {
      this.isRecountingProcess = false
    }
  }

  private async calcMinMaxRecieved (): Promise<void> {
    const amount = this.isExchangeB ? this.fromValue : this.toValue
    const minMaxReceived = await api.getMinMaxValue(this.tokenFrom?.address, this.tokenTo?.address, amount, this.slippageTolerance, this.isExchangeB)

    this.setMinMaxReceived(minMaxReceived)
  }

  private async updatePrices (): Promise<void> {
    if (this.areTokensSelected) {
      await this.getPrices({
        assetAAddress: this.tokenFrom.address,
        assetBAddress: this.tokenTo.address,
        amountA: this.fromValue,
        amountB: this.toValue
      })
    }
  }

  isInsufficientAmountError (tokenSymbol: string, errorMessage): boolean {
    // TODO: If an input field has too many symbols this is a way to avoid an error, find another approach later
    if (errorMessage.indexOf('invalid string input for fixed point number') !== -1) {
      this.isInsufficientAmount = true
      this.insufficientAmountTokenSymbol = tokenSymbol
      this.resetPrices()
    }
    return this.isInsufficientAmount
  }

  async handleFocusField (isExchangeB = false): Promise<void> {
    const isZeroValue = isExchangeB ? this.isZeroToAmount : this.isZeroFromAmount
    const prevFocus = this.isExchangeB

    this.setExchangeB(isExchangeB)

    if (isZeroValue) {
      this.resetFieldFrom()
      this.resetFieldTo()
    }

    if (prevFocus !== this.isExchangeB) {
      await this.recountSwapValues()
    }
  }

  async handleSwitchTokens (): Promise<void> {
    const [fromAddress, toAddress] = [this.tokenFrom.address, this.tokenTo.address]

    await this.setTokenFromAddress(toAddress)
    await this.setTokenToAddress(fromAddress)

    if (this.isExchangeB) {
      this.setExchangeB(false)
      await this.handleInputFieldFrom(this.toValue)
    } else {
      this.setExchangeB(true)
      await this.handleInputFieldTo(this.fromValue)
    }
  }

  async handleMaxValue (): Promise<void> {
    this.setExchangeB(false)

    await this.getNetworkFee()

    const max = getMaxValue(this.tokenFrom, this.networkFee)

    this.handleInputFieldFrom(max)
  }

  handleConnectWallet (): void {
    router.push({ name: PageNames.Wallet })
  }

  openSelectTokenDialog (isTokenFrom: boolean): void {
    if (isTokenFrom) {
      this.isTokenFromSelected = true
    }
    this.showSelectTokenDialog = true
  }

  async selectToken (token: any): Promise<void> {
    if (token) {
      if (this.isTokenFromSelected) {
        this.isTokenFromSelected = false
        await this.setTokenFromAddress(token.address)
      } else {
        await this.setTokenToAddress(token.address)
      }
      await this.recountSwapValues()
    }
  }

  handleConfirmSwap (): void {
    this.showConfirmSwapDialog = true
  }

  async updateAccountAssets (): Promise<void> {
    try {
      await api.updateAccountAssets()
    } catch (error) {
      this.$alert(this.t(error.message), { title: this.t('errorText') })
      console.error(error)
    }
  }

  async confirmSwap (isSwapConfirmed: boolean): Promise<any> {
    if (isSwapConfirmed) {
      this.resetFieldFrom()
      this.resetFieldTo()
      this.setTokenFromPrice(true)
      this.resetPrices()
      this.setExchangeB(false)
    }
    await this.updateAccountAssets()
  }

  private isZeroValue (value: string): boolean {
    return +value === 0
  }

  openSettingsDialog (): void {
    this.showSettings = true
  }
}
</script>

<style lang="scss">
.el-form--actions {
  .el-button--switch-tokens {
    @include switch-button-inherit-styles('medium');
  }
  .s-input--token-value .el-input .el-input__inner {
    @include text-ellipsis;
  }
}
</style>

<style lang="scss" scoped>
.el-form--actions {
  @include input-form-styles;
  @include buttons;
  @include full-width-button;
  @include vertical-divider('el-button--switch-tokens', $inner-spacing-medium);

  .input-title-estimated {
    margin-left: $inner-spacing-mini / 2;
    font-size: var(--s-font-size-mini);
    font-weight: 400;
    opacity: 0;
    &--show {
      opacity: 1;
    }
  }

  .el-button--switch-tokens {
    @include switch-button(var(--s-size-medium));
  }
}
</style>