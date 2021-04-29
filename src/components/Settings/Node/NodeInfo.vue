<template>
  <s-form :model="nodeModel" :rules="validationRules" ref="nodeForm" class="node-info s-flex" @submit.prevent="submitForm">
    <generic-page-header has-button-back :title="title" @back="handleBack">
      <s-button
        v-if="existing && removable"
        type="action"
        icon="basic-trash-24"
        tooltip-placement="bottom-end"
        @click="removeNode(nodeModel)"
      />
    </generic-page-header>
    <s-form-item prop="name">
      <s-input class="node-info-input" :placeholder="t('nameText')" v-model="nodeModel.name" :disabled="existing" />
    </s-form-item>
    <s-form-item prop="address">
      <s-input class="node-info-input" :placeholder="t('addressText')" v-model="nodeModel.address" :disabled="existing" />
    </s-form-item>
    <s-button type="primary" native-type="submit" class="node-info-button" :disabled="disabled" :loading="loading" @click="submitForm" >{{ buttonText }}</s-button>
    <external-link v-if="!existing" :href="tutorialLink" :title="t('selectNodeDialog.howToSetupOwnNode')" />
  </s-form>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'

import { lazyComponent } from '@/router'
import { Components, Links } from '@/consts'
import { wsRegexp, dnsRegexp, ipv4Regexp } from '@/utils/regexp'
import { NodeModel } from './consts'

import TranslationMixin from '@/components/mixins/TranslationMixin'

const checkAddress = (translate: Function): Function => (rule, value, callback): void => {
  if (!value) {
    return callback(new Error(translate('selectNodeDialog.messages.emptyAddress')))
  }

  if (!wsRegexp.test(value)) {
    return callback(new Error(translate('selectNodeDialog.messages.incorrectProtocol')))
  }

  const address = value.replace(wsRegexp, '')

  if (!dnsRegexp.test(address) && !ipv4Regexp.test(address)) {
    return callback(new Error(translate('selectNodeDialog.messages.incorrectAddress')))
  }

  callback()
}

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    ExternalLink: lazyComponent(Components.ExternalLink)
  }
})
export default class NodeInfo extends Mixins(TranslationMixin) {
  @Prop({ default: () => {}, type: Function }) handleBack!: () => void
  @Prop({ default: () => {}, type: Function }) handleNode!: (node) => void
  @Prop({ default: () => {}, type: Function }) removeNode!: (node) => void
  @Prop({ default: () => ({}), type: Object }) node!: any
  @Prop({ default: false, type: Boolean }) existing!: boolean
  @Prop({ default: false, type: Boolean }) disabled!: boolean
  @Prop({ default: false, type: Boolean }) loading!: boolean
  @Prop({ default: false, type: Boolean }) removable!: boolean
  @Prop({ default: false, type: Boolean }) connected!: boolean

  readonly tutorialLink = Links.nodes.tutorial

  readonly validationRules = {
    name: [
      { required: true, message: this.t('selectNodeDialog.messages.emptyName'), trigger: 'blur' }
    ],
    address: [
      { validator: checkAddress(this.t), trigger: 'blur' }
    ]
  }

  nodeModel: any = { ...NodeModel }

  created (): void {
    this.nodeModel = Object.keys(NodeModel).reduce((result, key) => ({
      ...result,
      [key]: this.node[key] ?? NodeModel[key]
    }), {})
  }

  get buttonText (): string {
    if (this.connected) return this.t('selectNodeDialog.connected')

    return this.existing ? this.t('selectNodeDialog.select') : this.t('selectNodeDialog.addNode')
  }

  get title (): string {
    return this.existing ? this.node.title : this.t('selectNodeDialog.customNode')
  }

  async submitForm (): Promise<void> {
    try {
      await (this.$refs.nodeForm as any).validate()

      this.handleNode(this.nodeModel)
    } catch (error) {
    }
  }
}
</script>

<style lang="scss">
.node-info {
  .el-form-item.is-error > .el-form-item__content {
    & > [class^="s-input"]:not(.s-disabled) {
      &, &:hover {
        & .el-input > input {
          background-color: inherit;
        }
      }

      .s-placeholder {
        background-color: inherit;
      }
    }

    & > .el-form-item__error,
    & > .s-icon-status-error {
      color: var(--s-color-status-error) !important;
    }
  }
}

</style>

<style lang="scss" scoped>
.node-info {
  flex-direction: column;
  align-items: center;

  & > *:not(:last-child) {
    margin-bottom: $inner-spacing-medium;
    width: 100%;
  }

  &-button {
    width: 100%;
  }
}
</style>