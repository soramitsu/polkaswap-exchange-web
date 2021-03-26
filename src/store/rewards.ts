import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import { api } from '@soramitsu/soraneo-wallet-web'
import { FPNumber, KnownSymbols, KnownAssets, RewardInfo, CodecString, AccountAsset } from '@sora-substrate/util'
import web3Util from '@/utils/web3-util'

export interface RewardAmountSymbol {
  amount?: string;
  symbol: KnownSymbols;
}

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'RESET',
    'SET_TRANSACTION_STEP',
    'SET_TRANSACTION_ERROR',
    'SET_REWARDS_CLAIMING',
    'SET_REWARDS_RECIEVED',
    'SET_SIGNATURE'
  ]),
  map(x => [x, x]),
  fromPairs
)([
  'GET_REWARDS',
  'GET_FEE'
])

interface RewardsState {
  fee: CodecString;
  rewards: Array<RewardInfo>;
  rewardsFetching: boolean;
  rewardsClaiming: boolean;
  rewardsRecieved: boolean;
  transactionError: boolean;
  transactionStep: number;
  transactionStepsCount: number;
  signature: string;
}

function initialState (): RewardsState {
  return {
    fee: '',
    rewards: [],
    rewardsFetching: false,
    rewardsClaiming: false,
    rewardsRecieved: false,
    transactionError: false,
    transactionStep: 1,
    transactionStepsCount: 2,
    signature: ''
  }
}

const state = initialState()

const getters = {
  tokenXOR (state, getters, rootState, rootGetters): AccountAsset {
    const token = KnownAssets.get(KnownSymbols.XOR)

    return rootGetters['assets/getAssetDataByAddress'](token?.address)
  },
  rewardsChecked (state: RewardsState): boolean {
    return !state.rewardsFetching && Array.isArray(state.rewards)
  },
  claimableRewards (state: RewardsState): Array<RewardInfo> {
    return state.rewards.reduce((claimableList: Array<RewardInfo>, item: RewardInfo) => {
      if (FPNumber.fromCodecValue(item.amount, item.asset.decimals).isZero()) return claimableList

      claimableList.push(item)

      return claimableList
    }, [])
  },
  rewardsAvailable (state, getters): boolean {
    return getters.claimableRewards.length !== 0
  },
  rewardsByAssetsList (state, getters): Array<RewardAmountSymbol> {
    if (!getters.rewardsAvailable) {
      return [
        {
          symbol: KnownSymbols.PSWAP,
          amount: undefined
        } as RewardAmountSymbol,
        {
          symbol: KnownSymbols.VAL,
          amount: undefined
        } as RewardAmountSymbol
      ]
    }

    const rewardsHash = getters.claimableRewards.reduce((result, { asset, amount }: RewardInfo) => {
      const { address, decimals } = asset
      const current = result[address] || new FPNumber(0, decimals)
      const addValue = FPNumber.fromCodecValue(amount, decimals)

      result[address] = current.add(addValue)

      return result
    }, {})

    return Object.entries(rewardsHash).reduce((total: Array<RewardAmountSymbol>, [address, amount]) => {
      if ((amount as FPNumber).isZero()) return total

      const item = {
        symbol: KnownAssets.get(address).symbol,
        amount: (amount as FPNumber).format()
      } as RewardAmountSymbol

      total.push(item)

      return total
    }, [])
  }
}

const mutations = {
  [types.RESET] (state: RewardsState) {
    const s = initialState()

    Object.keys(s).forEach(key => {
      state[key] = s[key]
    })
  },

  [types.SET_TRANSACTION_STEP] (state: RewardsState, transactionStep: number) {
    state.transactionStep = transactionStep
  },
  [types.SET_REWARDS_CLAIMING] (state: RewardsState, flag: boolean) {
    state.rewardsClaiming = flag
  },
  [types.SET_TRANSACTION_ERROR] (state: RewardsState, flag: boolean) {
    state.transactionError = flag
  },
  [types.SET_REWARDS_RECIEVED] (state: RewardsState, flag: boolean) {
    state.rewardsRecieved = flag
  },
  [types.SET_SIGNATURE] (state: RewardsState, signature: string) {
    state.signature = signature
  },

  [types.GET_REWARDS_REQUEST] (state: RewardsState) {
    state.rewards = []
    state.rewardsFetching = true
  },
  [types.GET_REWARDS_SUCCESS] (state: RewardsState, rewards) {
    state.rewards = rewards
    state.rewardsFetching = false
  },
  [types.GET_REWARDS_FAILURE] (state: RewardsState) {
    state.rewards = []
    state.rewardsFetching = false
  },

  [types.GET_FEE_REQUEST] (state: RewardsState) {},
  [types.GET_FEE_SUCCESS] (state: RewardsState, fee: CodecString) {
    state.fee = fee
  },
  [types.GET_FEE_FAILURE] (state: RewardsState) {}
}

const actions = {
  reset ({ commit }) {
    commit(types.RESET)
  },

  setTransactionStep ({ commit }, transactionStep: number) {
    commit(types.SET_TRANSACTION_STEP, transactionStep)
  },

  async getNetworkFee ({ commit }) {
    commit(types.GET_FEE_REQUEST)
    try {
      const fee = await api.getClaimRewardsNetworkFee()
      commit(types.GET_FEE_SUCCESS, fee)
    } catch (error) {
      console.error(error)
      commit(types.GET_FEE_FAILURE, error)
    }
  },

  async getRewards ({ commit }, address) {
    commit(types.GET_REWARDS_REQUEST)
    try {
      const rewards = await api.checkExternalAccountRewards(address)

      const isEmpty = rewards.every(item => +item.amount === 0)

      if (isEmpty) {
        throw new Error('rewards.notification.empty')
      }

      commit(types.GET_REWARDS_SUCCESS, rewards)
    } catch (error) {
      commit(types.GET_REWARDS_FAILURE)
      throw error
    }
  },

  async claimRewards (
    { commit, state }: { commit: any; state: RewardsState },
    { internalAddress = '', externalAddress = '' } = {}
  ) {
    if (!internalAddress || !externalAddress) return

    try {
      const web3 = await web3Util.getInstance()

      commit(types.SET_REWARDS_CLAIMING, true)
      commit(types.SET_TRANSACTION_ERROR, false)

      if (state.transactionStep === 1) {
        const internalAddressHex = await web3Util.accountAddressToHex(internalAddress)
        const message = web3.utils.sha3(internalAddressHex)
        if (!message) {
          throw new Error('')
        }

        const signature = await web3.eth.personal.sign(message, externalAddress, '')

        commit(types.SET_SIGNATURE, signature)
        commit(types.SET_TRANSACTION_STEP, 2)
      }
      if (state.transactionStep === 2 && state.signature) {
        await api.claimRewards(
          state.signature,
          externalAddress,
          state.fee,
          state.rewards
        )

        commit(types.SET_TRANSACTION_STEP, 1)
        commit(types.SET_REWARDS_RECIEVED, true)
      }
    } catch (error) {
      commit(types.SET_TRANSACTION_ERROR, true)
      throw error
    } finally {
      commit(types.SET_REWARDS_CLAIMING, false)
    }
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}