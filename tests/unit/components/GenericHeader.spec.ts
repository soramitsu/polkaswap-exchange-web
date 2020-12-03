import { shallowMount, createLocalVue } from '@vue/test-utils'

import GenericHeader from '@/components/GenericHeader.vue'
import { SoramitsuElementsImport, TranslationMock } from '../../utils'

const localVue = createLocalVue()
SoramitsuElementsImport(localVue)

describe('TokenLogo.vue', () => {
  beforeEach(() => {
    TranslationMock(GenericHeader)
  })

  it('should renders correctly', () => {
    const wrapper = shallowMount(GenericHeader, {
      localVue,
      propsData: {
        hasButtonBack: false,
        title: 'Your liquidity',
        tooltip: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
      }
    })
    expect(wrapper.element).toMatchSnapshot()
  })
})
