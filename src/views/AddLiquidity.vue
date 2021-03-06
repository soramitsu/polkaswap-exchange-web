<template>
  <div v-loading="parentLoading" class="container">
    <generic-page-header has-button-back :title="t('addLiquidity.title')" :tooltip="t('pool.description')" @back="handleBack" />
    <s-form
      class="el-form--actions"
      :show-message="false"
    >
      <s-float-input
        class="s-input--token-value"
        size="medium"
        :value="firstTokenValue"
        :decimals="(firstToken || {}).decimals"
        has-locale-string
        :delimiters="delimiters"
        :max="getMax((firstToken || {}).address)"
        :disabled="!areTokensSelected"
        @input="handleTokenChange($event, setFirstTokenValue)"
        @blur="resetFocusedField"
      >
        <div slot="top" class="input-line">
          <div class="input-title">
            <span class="input-title--uppercase input-title--primary">{{ t('createPair.deposit') }}</span>
          </div>
          <div v-if="isLoggedIn && firstToken" class="input-value">
            <span class="input-value--uppercase">{{ t('createPair.balance') }}</span>
            <span class="input-value--primary">{{ getTokenBalance(firstToken) }}</span>
            <formatted-amount v-if="firstTokenPrice" :value="getFiatBalance(firstToken)" is-fiat-value />
        </div>
        </div>
        <div slot="right" class="s-flex el-buttons">
          <s-button v-if="isFirstMaxButtonAvailable" class="el-button--max s-typography-button--small" type="primary" alternative size="mini" border-radius="mini" @click="handleMaxValue(firstToken, setFirstTokenValue)">
            {{ t('buttons.max') }}
          </s-button>
          <token-select-button class="el-button--select-token" :token="firstToken" />
        </div>
        <div slot="bottom" class="input-line input-line--footer">
          <formatted-amount v-if="firstToken && firstTokenPrice" :value="fiatFirstAmount" is-fiat-value />
          <token-address v-if="firstToken" :name="firstToken.name" :symbol="firstToken.symbol" :address="firstToken.address" class="input-value" />
        </div>
      </s-float-input>
      <s-icon class="icon-divider" name="plus-16" />
      <s-float-input
        class="s-input--token-value"
        size="medium"
        :value="secondTokenValue"
        :decimals="(secondToken || {}).decimals"
        has-locale-string
        :delimiters="delimiters"
        :max="getMax((secondToken || {}).address)"
        :disabled="!areTokensSelected"
        @input="handleTokenChange($event, setSecondTokenValue)"
        @blur="resetFocusedField"
      >
        <div slot="top" class="input-line">
          <div class="input-title">
            <span class="input-title--uppercase input-title--primary">{{ t('createPair.deposit') }}</span>
          </div>
          <div v-if="isLoggedIn && secondToken" class="input-value">
            <span class="input-value--uppercase">{{ t('createPair.balance') }}</span>
            <span class="input-value--primary">{{ getTokenBalance(secondToken) }}</span>
            <formatted-amount v-if="secondTokenPrice" :value="getFiatBalance(secondToken)" is-fiat-value />
        </div>
        </div>
        <div slot="right" class="s-flex el-buttons">
          <s-button v-if="isSecondMaxButtonAvailable" class="el-button--max s-typography-button--small" type="primary" alternative size="mini" border-radius="mini" @click="handleMaxValue(secondToken, setSecondTokenValue)">
            {{ t('buttons.max') }}
          </s-button>
          <token-select-button class="el-button--select-token" icon="chevron-down-rounded-16" :token="secondToken" @click="openSelectSecondTokenDialog" />
        </div>
        <div slot="bottom" class="input-line input-line--footer">
          <formatted-amount v-if="secondToken && secondTokenPrice" :value="fiatSecondAmount" is-fiat-value />
          <token-address v-if="secondToken" :name="secondToken.name" :symbol="secondToken.symbol" :address="secondToken.address" class="input-value" />
        </div>
      </s-float-input>
      <s-button type="primary" class="action-button s-typography-button--large" :disabled="!areTokensSelected || isEmptyBalance || isInsufficientBalance || !isAvailable" @click="openConfirmDialog">
        <template v-if="!areTokensSelected">
          {{ t('buttons.chooseTokens') }}
        </template>
        <template v-else-if="!isAvailable">
          {{ t('addLiquidity.pairIsNotCreated') }}
        </template>
        <template v-else-if="isEmptyBalance">
          {{ t('buttons.enterAmount') }}
        </template>
        <template v-else-if="isInsufficientBalance">
          {{ t('exchange.insufficientBalance', { tokenSymbol: insufficientBalanceTokenSymbol }) }}
        </template>
        <template v-else>
          {{ t('createPair.supply') }}
        </template>
      </s-button>
      <slippage-tolerance class="slippage-tolerance-settings" />
    </s-form>

    <div v-if="areTokensSelected && isAvailable && !isNotFirstLiquidityProvider && emptyAssets" class="info-line-container">
      <p class="info-line-container__title">{{ t('createPair.firstLiquidityProvider') }}</p>
      <info-line>
        <template #info-line-prefix>
          <p class="info-line--first-liquidity" v-html="t('createPair.firstLiquidityProviderInfo')" />
        </template>
      </info-line>
    </div>

    <div v-if="areTokensSelected && isAvailable && !emptyAssets" class="info-line-container">
      <p class="info-line-container__title">{{ t('createPair.pricePool') }}</p>
      <info-line :label="t('addLiquidity.firstPerSecond', { first: firstToken.symbol, second: secondToken.symbol })" :value="formattedPrice" />
      <info-line :label="t('addLiquidity.firstPerSecond', { first: secondToken.symbol, second: firstToken.symbol })" :value="formattedPriceReversed" />
      <info-line v-if="strategicBonusApy" :label="t('pool.strategicBonusApy')" :value="strategicBonusApy" />
      <info-line
       :label="t('createPair.networkFee')"
       :label-tooltip="t('networkFeeTooltipText')"
       :value="formattedFee"
       :asset-symbol="KnownSymbols.XOR"
       :fiat-value="getFiatAmountByCodecString(networkFee)"
       is-formatted
      />
    </div>

    <div v-if="areTokensSelected && isAvailable && (!emptyAssets || (liquidityInfo || {}).balance)" class="info-line-container">
      <p class="info-line-container__title">{{ t(`createPair.yourPosition${!emptyAssets ? 'Estimated' : ''}`) }}</p>
      <info-line
        :label="firstToken.symbol"
        :value="formattedFirstTokenPosition"
        :fiat-value="fiatFirstTokenPosition"
        is-formatted
      />
      <info-line
        :label="secondToken.symbol"
        :value="formattedSecondTokenPosition"
        :fiat-value="fiatSecondTokenPosition"
        is-formatted
      />
      <info-line :label="t('createPair.shareOfPool')" :value="`${shareOfPool}%`" />
    </div>

    <select-token :visible.sync="showSelectSecondTokenDialog" :connected="isLoggedIn" :asset="firstToken" @select="setSecondTokenAddress($event.address)" />

    <confirm-token-pair-dialog
      :visible.sync="showConfirmDialog"
      :parent-loading="parentLoading"
      :share-of-pool="shareOfPool"
      :first-token="firstToken"
      :second-token="secondToken"
      :first-token-value="firstTokenValue"
      :second-token-value="secondTokenValue"
      :minted="formattedMinted"
      :price="price"
      :price-reversed="priceReversed"
      :slippage-tolerance="slippageTolerance"
      @confirm="handleConfirmAddLiquidity"
    />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import { FPNumber, AccountLiquidity, CodecString, KnownAssets, KnownSymbols } from '@sora-substrate/util'
import { components } from '@soramitsu/soraneo-wallet-web'

import CreateTokenPairMixin from '@/components/mixins/TokenPairMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'

import router, { lazyComponent } from '@/router'
import { Components } from '@/consts'

const namespace = 'addLiquidity'

const TokenPairMixin = CreateTokenPairMixin(namespace)

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    SelectToken: lazyComponent(Components.SelectToken),
    TokenLogo: lazyComponent(Components.TokenLogo),
    SlippageTolerance: lazyComponent(Components.SlippageTolerance),
    ConfirmTokenPairDialog: lazyComponent(Components.ConfirmTokenPairDialog),
    TokenSelectButton: lazyComponent(Components.TokenSelectButton),
    TokenAddress: lazyComponent(Components.TokenAddress),
    FormattedAmount: components.FormattedAmount,
    InfoLine: components.InfoLine
  }
})

export default class AddLiquidity extends Mixins(LoadingMixin, TokenPairMixin) {
  @Getter('isNotFirstLiquidityProvider', { namespace }) isNotFirstLiquidityProvider!: boolean
  @Getter('shareOfPool', { namespace }) shareOfPool!: string
  @Getter('liquidityInfo', { namespace }) liquidityInfo!: AccountLiquidity

  @Action('setDataFromLiquidity', { namespace }) setDataFromLiquidity!: (params: any) => Promise<void>
  @Action('addLiquidity', { namespace }) addLiquidity!: AsyncVoidFn
  @Action('resetFocusedField', { namespace }) resetFocusedField!: AsyncVoidFn

  readonly delimiters = FPNumber.DELIMITERS_CONFIG

  async mounted (): Promise<void> {
    await this.withParentLoading(async () => {
      if (this.firstAddress && this.secondAddress) {
        await this.setDataFromLiquidity({
          firstAddress: this.firstAddress,
          secondAddress: this.secondAddress
        })
        // If user don't have the liquidity (navigated through the address bar) redirect to the Pool page
        if (!this.liquidityInfo) {
          return this.handleBack()
        }
      } else {
        await this.setFirstTokenAddress(KnownAssets.get(KnownSymbols.XOR).address)
      }
    })
  }

  get firstAddress (): string {
    return router.currentRoute.params.firstAddress
  }

  get secondAddress (): string {
    return router.currentRoute.params.secondAddress
  }

  get chooseTokenClasses (): string {
    const buttonClass = 'el-button'
    const classes = [buttonClass, buttonClass + '--choose-token']

    if (this.secondAddress) {
      classes.push(`${buttonClass}--disabled`)
    }

    return classes.join(' ')
  }

  get emptyAssets (): boolean {
    if (!(this.firstTokenValue || this.secondTokenValue)) {
      return true
    }
    const first = new FPNumber(this.firstTokenValue)
    const second = new FPNumber(this.secondTokenValue)
    return (first.isNaN() || first.isZero()) || (second.isNaN() || second.isZero())
  }

  get firstTokenPosition (): FPNumber {
    return this.getTokenPosition(this.liquidityInfo?.firstBalance, this.firstTokenValue)
  }

  get secondTokenPosition (): FPNumber {
    return this.getTokenPosition(this.liquidityInfo?.secondBalance, this.secondTokenValue)
  }

  get formattedFirstTokenPosition (): string {
    return this.firstTokenPosition.toLocaleString()
  }

  get formattedSecondTokenPosition (): string {
    return this.secondTokenPosition.toLocaleString()
  }

  get fiatFirstTokenPosition (): Nullable<string> {
    return this.getFiatAmountByFPNumber(this.firstTokenPosition, this.firstToken)
  }

  get fiatSecondTokenPosition (): Nullable<string> {
    return this.getFiatAmountByFPNumber(this.secondTokenPosition, this.secondToken)
  }

  getTokenPosition (liquidityInfoBalance: string | undefined, tokenValue: string | CodecString | number): FPNumber {
    const prevPosition = FPNumber.fromCodecValue(liquidityInfoBalance ?? 0)
    if (!this.emptyAssets) {
      return prevPosition.add(new FPNumber(tokenValue))
    }
    return prevPosition
  }

  get strategicBonusApy (): Nullable<string> {
    // It won't be in template when not defined
    const strategicBonusApy = this.fiatPriceAndApyObject[this.secondToken.address]?.strategicBonusApy
    if (!strategicBonusApy) {
      return null
    }
    return `${this.getFPNumberFromCodec(strategicBonusApy).mul(this.Hundred).toLocaleString()}%`
  }

  updatePrices (): void {
    this.getPrices({
      assetAAddress: this.firstAddress ?? this.firstToken.address,
      assetBAddress: this.secondAddress ?? this.secondToken.address,
      amountA: this.firstTokenValue,
      amountB: this.secondTokenValue
    })
  }

  handleConfirmAddLiquidity (): Promise<void> {
    return this.handleConfirm(this.addLiquidity)
  }
}
</script>

<style lang="scss">
.el-form--actions {
  .s-input--token-value .el-input .el-input__inner {
    @include text-ellipsis;
  }
}
</style>

<style lang="scss" scoped>
.el-form--actions {
  @include generic-input-lines;
  @include buttons;
  @include full-width-button('action-button');
}

@include vertical-divider('icon-divider', $inner-spacing-medium);
@include vertical-divider('el-divider');
</style>
