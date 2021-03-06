import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import { api } from '@soramitsu/soraneo-wallet-web'
import { CodecString, Operation } from '@sora-substrate/util'

import { ZeroStringValue } from '@/consts'
import { TokenBalanceSubscriptions } from '@/utils/subscriptions'

const balanceSubscriptions = new TokenBalanceSubscriptions()

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'SET_FIRST_TOKEN_ADDRESS',
    'SET_SECOND_TOKEN_ADDRESS',
    'SET_FIRST_TOKEN_VALUE',
    'SET_SECOND_TOKEN_VALUE',
    'SET_SECOND_TOKEN_BALANCE',
    'SET_FOCUSED_FIELD'
  ]),
  map(x => [x, x]),
  fromPairs
)([
  'CREATE_PAIR',
  'ESTIMATE_MINTED',
  'CHECK_LIQUIDITY'
])

interface CreatePairState {
  firstTokenAddress: string;
  secondTokenAddress: string;
  firstTokenValue: string;
  secondTokenValue: string;
  secondTokenBalance: any;
  minted: CodecString;
  isAvailable: boolean;
}

function initialState (): CreatePairState {
  return {
    firstTokenAddress: '',
    secondTokenAddress: '',
    firstTokenValue: '',
    secondTokenValue: '',
    secondTokenBalance: null,
    minted: '',
    isAvailable: false
  }
}

const state = initialState()

const getters = {
  firstToken (state: CreatePairState, getters, rootState, rootGetters) {
    return rootGetters['assets/getAssetDataByAddress'](state.firstTokenAddress)
  },
  secondToken (state: CreatePairState, getters, rootState, rootGetters) {
    const token = rootGetters['assets/getAssetDataByAddress'](state.secondTokenAddress)
    const balance = state.secondTokenBalance

    return balance ? { ...token, balance } : token
  },
  firstTokenValue (state: CreatePairState) {
    return state.firstTokenValue
  },
  secondTokenValue (state: CreatePairState) {
    return state.secondTokenValue
  },
  isAvailable (state: CreatePairState) {
    return state.isAvailable
  },
  minted (state: CreatePairState) {
    return state.minted || ZeroStringValue
  }
}

const mutations = {
  [types.SET_FIRST_TOKEN_ADDRESS] (state: CreatePairState, address: string) {
    state.firstTokenAddress = address
  },
  [types.SET_SECOND_TOKEN_ADDRESS] (state: CreatePairState, address: string) {
    state.secondTokenAddress = address
  },
  [types.SET_FIRST_TOKEN_VALUE] (state: CreatePairState, firstTokenValue: string) {
    state.firstTokenValue = firstTokenValue
  },
  [types.SET_SECOND_TOKEN_VALUE] (state: CreatePairState, secondTokenValue: string) {
    state.secondTokenValue = secondTokenValue
  },
  [types.SET_SECOND_TOKEN_BALANCE] (state: CreatePairState, balance = null) {
    state.secondTokenBalance = balance
  },
  [types.CREATE_PAIR_REQUEST] (state: CreatePairState) {
  },
  [types.CREATE_PAIR_SUCCESS] (state: CreatePairState) {
  },
  [types.CREATE_PAIR_FAILURE] (state: CreatePairState, error) {
  },
  [types.ESTIMATE_MINTED_REQUEST] (state: CreatePairState) {
  },
  [types.ESTIMATE_MINTED_SUCCESS] (state: CreatePairState, minted: CodecString) {
    state.minted = minted
  },
  [types.ESTIMATE_MINTED_FAILURE] (state: CreatePairState, error) {
  },
  [types.CHECK_LIQUIDITY_REQUEST] (state: CreatePairState) {},
  [types.CHECK_LIQUIDITY_SUCCESS] (state: CreatePairState, isAvailable: boolean) {
    state.isAvailable = isAvailable
  },
  [types.CHECK_LIQUIDITY_FAILURE] (state: CreatePairState) {}
}

const actions = {
  async setFirstTokenAddress ({ commit, dispatch }, address: string) {
    commit(types.SET_FIRST_TOKEN_ADDRESS, address)
    await dispatch('checkLiquidity')
  },

  async setSecondTokenAddress ({ commit, dispatch, getters, rootGetters }, address: string) {
    const updateBalance = balance => commit(types.SET_SECOND_TOKEN_BALANCE, balance)

    commit(types.SET_SECOND_TOKEN_ADDRESS, address)

    balanceSubscriptions.remove('second', { updateBalance })

    if (getters.secondToken?.address && !(getters.secondToken.address in rootGetters.accountAssetsAddressTable)) {
      balanceSubscriptions.add('second', { updateBalance, token: getters.secondToken })
    }

    await dispatch('checkLiquidity')
  },

  async checkLiquidity ({ commit, getters, dispatch }) {
    if (getters.firstToken && getters.secondToken) {
      commit(types.CHECK_LIQUIDITY_REQUEST)
      try {
        const exists = await api.checkLiquidity(getters.firstToken.address, getters.secondToken.address)
        commit(types.CHECK_LIQUIDITY_SUCCESS, !exists)
        dispatch('estimateMinted')
      } catch (error) {
        commit(types.CHECK_LIQUIDITY_FAILURE, error)
      }
    }
  },

  async estimateMinted ({ commit, getters }) {
    if (getters.firstToken?.address && getters.secondToken?.address && getters.firstTokenValue && getters.secondTokenValue) {
      commit(types.ESTIMATE_MINTED_REQUEST)
      try {
        const [minted] = await api.estimatePoolTokensMinted(
          getters.firstToken.address,
          getters.secondToken.address,
          getters.firstTokenValue,
          getters.secondTokenValue,
          ZeroStringValue,
          ZeroStringValue
        )
        commit(types.ESTIMATE_MINTED_SUCCESS, minted)
      } catch (error) {
        commit(types.ESTIMATE_MINTED_FAILURE, error)
      }
    }
  },

  setFirstTokenValue ({ commit, dispatch }, value: string | number) {
    commit(types.SET_FIRST_TOKEN_VALUE, value)
    dispatch('estimateMinted')
  },

  setSecondTokenValue ({ commit, dispatch }, value: string | number) {
    commit(types.SET_SECOND_TOKEN_VALUE, value)
    dispatch('estimateMinted')
  },

  async createPair ({ commit, getters, rootGetters }) {
    commit(types.CREATE_PAIR_REQUEST)
    try {
      await api.createPair(
        getters.firstToken.address,
        getters.secondToken.address,
        getters.firstTokenValue,
        getters.secondTokenValue,
        rootGetters.slippageTolerance
      )
      commit(types.CREATE_PAIR_SUCCESS)
    } catch (error) {
      commit(types.CREATE_PAIR_FAILURE)
      throw error
    }
  },

  resetData ({ commit }, withAssets = false) {
    balanceSubscriptions.remove('second', { updateBalance: balance => commit(types.SET_SECOND_TOKEN_BALANCE, balance) })

    if (!withAssets) {
      commit(types.SET_FIRST_TOKEN_ADDRESS, '')
      commit(types.SET_SECOND_TOKEN_ADDRESS, '')
    }
    commit(types.SET_FIRST_TOKEN_VALUE, '')
    commit(types.SET_SECOND_TOKEN_VALUE, '')
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
