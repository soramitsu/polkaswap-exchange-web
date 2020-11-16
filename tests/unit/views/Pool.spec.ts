import { shallowMount, createLocalVue } from '@vue/test-utils'
import SoramitsuElements from '@soramitsu/soramitsu-js-ui'

import Pool from '@/components/Pool.vue'
import { TranslationMock } from '../../utils'

const localVue = createLocalVue()
localVue.use(SoramitsuElements)

describe('Pool.vue', () => {
  beforeEach(() => {
    TranslationMock(Pool)
  })

  it('should renders correctly', () => {
    const wrapper = shallowMount(Pool, { localVue })
    expect(wrapper.element).toMatchSnapshot()
  })
})
