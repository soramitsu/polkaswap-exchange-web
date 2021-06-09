import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import flatten from 'lodash/fp/flatten'
import {
  FPNumber,
  BridgeApprovedRequest,
  BridgeCurrencyType,
  BridgeNetworks,
  BridgeTxStatus,
  BridgeRequest,
  BridgeDirection,
  Operation,
  BridgeHistory,
  TransactionStatus,
  KnownAssets,
  CodecString,
  RegisteredAssets
} from '@sora-substrate/util'
import { api } from '@soramitsu/soraneo-wallet-web'
import { Transaction } from 'web3-core'

import { bridgeApi } from '@/utils/bridge'
import { STATES } from '@/utils/fsm'
import web3Util, { ABI, KnownBridgeAsset, OtherContractType } from '@/utils/web3-util'
import { TokenBalanceSubscriptions } from '@/utils/subscriptions'
import { delay, isEthereumAddress } from '@/utils'
import { EthereumGasLimits, MaxUint256, ZeroStringValue } from '@/consts'

const SORA_REQUESTS_TIMEOUT = 5 * 1000

const balanceSubscriptions = new TokenBalanceSubscriptions()

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'SET_SORA_TO_EVM',
    'SET_ASSET_ADDRESS',
    'SET_ASSET_BALANCE',
    'SET_AMOUNT',
    'SET_SORA_TOTAL',
    'SET_EVM_TOTAL',
    'SET_TRANSACTION_CONFIRM',
    'SET_SORA_TRANSACTION_HASH',
    'SET_SORA_TRANSACTION_DATE',
    'SET_EVM_TRANSACTION_HASH',
    'SET_EVM_TRANSACTION_DATE',
    'SET_INITIAL_TRANSACTION_STATE',
    'SET_CURRENT_TRANSACTION_STATE',
    'SET_TRANSACTION_STEP',
    'SET_HISTORY_ITEM'
  ]),
  map(x => [x, x]),
  fromPairs
)([
  'GET_HISTORY',
  'GET_RESTORED_FLAG',
  'GET_RESTORED_HISTORY',
  'GET_SORA_NETWORK_FEE',
  'GET_EVM_NETWORK_FEE',
  'SIGN_SORA_TRANSACTION_SORA_EVM',
  'SIGN_EVM_TRANSACTION_SORA_EVM',
  'SEND_SORA_TRANSACTION_SORA_EVM',
  'SEND_EVM_TRANSACTION_SORA_EVM',
  'SIGN_SORA_TRANSACTION_EVM_SORA',
  'SIGN_EVM_TRANSACTION_EVM_SORA',
  'SEND_SORA_TRANSACTION_EVM_SORA',
  'SEND_EVM_TRANSACTION_EVM_SORA'
])

async function waitForApprovedRequest (hash: string): Promise<BridgeApprovedRequest> {
  await delay(SORA_REQUESTS_TIMEOUT)
  const approvedRequest = await bridgeApi.getApprovedRequest(hash)
  if (approvedRequest) {
    return approvedRequest
  }
  const request = await bridgeApi.getRequest(hash)
  if (!request) {
    return await waitForApprovedRequest(hash)
  }
  if ([BridgeTxStatus.Failed, BridgeTxStatus.Frozen].includes(request.status)) {
    // Set SORA_REJECTED
    throw new Error('Transaction was failed or canceled')
  }
  return await waitForApprovedRequest(hash)
  // Sora Pending
}

async function waitForEvmTransactionStatus (hash: string): Promise<Transaction> {
  const web3 = await web3Util.getInstance()
  const initialTx = await web3.eth.getTransaction(hash)
  const blocksToWait = 5
  if (!initialTx.blockNumber) {
    await delay(SORA_REQUESTS_TIMEOUT)
    return waitForEvmTransactionStatus(hash)
  } else {
    const latestBlock = await web3.eth.getBlockNumber()
    const blockDiff = latestBlock - initialTx.blockNumber
    if (blockDiff >= blocksToWait) {
      const currentTx = await web3.eth.getTransaction(hash)
      if (currentTx.blockNumber) return currentTx
      throw new Error(`Transaction (${hash}) does not exist / ended up as uncle block`)
    } else {
      await delay(SORA_REQUESTS_TIMEOUT)
      return waitForEvmTransactionStatus(hash)
    }
  }
}

function checkEvmNetwork (rootGetters): void {
  if (!rootGetters['web3/isValidNetworkType']) {
    throw new Error('Change evm network in Metamask')
  }
}

interface EthLogData {
  soraHash: string;
  ethHash: string;
}
const topic = '0x0ce781a18c10c8289803c7c4cfd532d797113c4b41c9701ffad7d0a632ac555b'
async function getEthUserTXs (contracts: Array<string>): Promise<Array<EthLogData>> {
  const web3 = await web3Util.getInstance()
  const getLogs = (address: string) => web3.eth.getPastLogs({
    topics: [topic],
    fromBlock: 8371261,
    toBlock: web3.eth.defaultBlock,
    address
  })
  const logs = flatten(await Promise.all(contracts.map(contract => getLogs(contract))))
  return logs.map<EthLogData>(log => ({ ethHash: log.transactionHash, soraHash: log.data }))
}

async function waitForRequest (hash: string): Promise<BridgeRequest> {
  await delay(SORA_REQUESTS_TIMEOUT)
  const request = await bridgeApi.getRequest(hash)
  if (!request) {
    return await waitForRequest(hash)
  }
  switch (request.status) {
    case BridgeTxStatus.Failed:
    case BridgeTxStatus.Frozen:
      throw new Error('Transaction was failed or canceled')
    case BridgeTxStatus.Done:
      return request
  }
  return await waitForRequest(hash)
}

async function waitForExtrinsicFinalization (id?: string): Promise<BridgeHistory> {
  if (!id) {
    console.error("Can't find history id")
    throw new Error('History id error')
  }
  const tx = bridgeApi.getHistory(id)
  if (tx && tx.status === TransactionStatus.Error) {
    throw new Error(tx.errorMessage)
  }
  if (!tx || tx.status !== TransactionStatus.Finalized) {
    await delay(250)
    return await waitForExtrinsicFinalization(id)
  }
  return tx
}

function initialState () {
  return {
    isSoraToEvm: true,
    assetAddress: '',
    assetBalance: null,
    amount: '',
    soraNetworkFee: 0,
    // Why only evmNetworkFee have ZeroStringValue variable?
    evmNetworkFee: ZeroStringValue,
    soraTotal: 0,
    evmTotal: 0,
    isTransactionConfirmed: false,
    soraTransactionHash: '',
    evmTransactionHash: '',
    soraTransactionDate: '',
    evmTransactionDate: '',
    initialTransactionState: STATES.INITIAL,
    currentTransactionState: STATES.INITIAL,
    transactionStep: 1,
    history: [],
    historyItem: null,
    restored: true
  }
}

const state = initialState()

const getters = {
  isSoraToEvm (state) {
    return state.isSoraToEvm
  },
  asset (state, getters, rootState, rootGetters) {
    const token = rootGetters['assets/getAssetDataByAddress'](state.assetAddress)
    const balance = state.assetBalance

    return balance ? { ...token, balance } : token
  },
  amount (state) {
    return state.amount
  },
  soraNetworkFee (state) {
    return state.soraNetworkFee
  },
  evmNetworkFee (state) {
    return state.evmNetworkFee
  },
  soraTotal (state) {
    return state.soraTotal
  },
  evmTotal (state) {
    return state.evmTotal
  },
  isTransactionConfirmed (state) {
    return state.isTransactionConfirmed
  },
  soraTransactionHash (state) {
    return state.soraTransactionHash
  },
  evmTransactionHash (state) {
    return state.evmTransactionHash
  },
  soraTransactionDate (state) {
    return state.soraTransactionDate
  },
  evmTransactionDate (state) {
    return state.evmTransactionDate
  },
  initialTransactionState (state) {
    return state.initialTransactionState
  },
  currentTransactionState (state) {
    return state.currentTransactionState
  },
  transactionStep (state) {
    return state.transactionStep
  },
  history (state) {
    return state.history
  },
  historyItem (state) {
    return state.historyItem
  },
  restored (state) {
    return state.restored
  }
}

const mutations = {
  [types.SET_SORA_TO_EVM] (state, isSoraToEvm: boolean) {
    state.isSoraToEvm = isSoraToEvm
  },
  [types.SET_ASSET_ADDRESS] (state, address: string) {
    state.assetAddress = address
  },
  [types.SET_ASSET_BALANCE] (state, balance = null) {
    state.assetBalance = balance
  },
  [types.SET_AMOUNT] (state, amount: string) {
    state.amount = amount
  },
  [types.GET_SORA_NETWORK_FEE_REQUEST] (state) {
  },
  [types.GET_SORA_NETWORK_FEE_SUCCESS] (state, fee) {
    state.soraNetworkFee = fee
  },
  [types.GET_SORA_NETWORK_FEE_FAILURE] (state) {
    state.soraNetworkFee = ''
  },
  [types.GET_EVM_NETWORK_FEE_REQUEST] (state) {
  },
  [types.GET_EVM_NETWORK_FEE_SUCCESS] (state, fee: CodecString) {
    state.evmNetworkFee = fee
  },
  [types.GET_EVM_NETWORK_FEE_FAILURE] (state) {
    state.evmNetworkFee = ZeroStringValue
  },
  [types.SET_SORA_TOTAL] (state, soraTotal: string | number) {
    state.soraTotal = soraTotal
  },
  [types.SET_EVM_TOTAL] (state, evmTotal: string | number) {
    state.evmTotal = evmTotal
  },
  [types.SET_TRANSACTION_CONFIRM] (state, isTransactionConfirmed: boolean) {
    state.isTransactionConfirmed = isTransactionConfirmed
  },
  [types.SET_SORA_TRANSACTION_HASH] (state, soraTransactionHash: string) {
    state.soraTransactionHash = soraTransactionHash
  },
  [types.SET_EVM_TRANSACTION_HASH] (state, evmTransactionHash: string) {
    state.evmTransactionHash = evmTransactionHash
  },
  [types.SET_SORA_TRANSACTION_DATE] (state, soraTransactionDate: string) {
    state.soraTransactionDate = soraTransactionDate
  },
  [types.SET_EVM_TRANSACTION_DATE] (state, evmTransactionDate: string) {
    state.evmTransactionDate = evmTransactionDate
  },
  [types.SET_CURRENT_TRANSACTION_STATE] (state, currentTransactionState: STATES) {
    state.currentTransactionState = currentTransactionState
  },
  [types.SET_INITIAL_TRANSACTION_STATE] (state, initialTransactionState: STATES) {
    state.initialTransactionState = initialTransactionState
  },
  [types.SET_TRANSACTION_STEP] (state, transactionStep: number) {
    state.transactionStep = transactionStep
  },
  [types.GET_HISTORY_REQUEST] (state) {
    state.history = null
  },
  [types.GET_HISTORY_SUCCESS] (state, history: Array<BridgeHistory>) {
    state.history = history
  },
  [types.GET_HISTORY_FAILURE] (state) {
    state.history = null
  },
  [types.GET_RESTORED_FLAG_REQUEST] (state) {
    state.restored = false
  },
  [types.GET_RESTORED_FLAG_SUCCESS] (state, restored: boolean) {
    state.restored = restored
  },
  [types.GET_RESTORED_FLAG_FAILURE] (state) {
    state.restored = false
  },
  [types.GET_RESTORED_HISTORY_REQUEST] (state) {},
  [types.GET_RESTORED_HISTORY_SUCCESS] (state) {},
  [types.GET_RESTORED_HISTORY_FAILURE] (state) {},
  [types.SET_HISTORY_ITEM] (state, historyItem: BridgeHistory | null) {
    state.historyItem = historyItem
  },
  [types.SIGN_SORA_TRANSACTION_SORA_EVM_REQUEST] (state) {},
  [types.SIGN_SORA_TRANSACTION_SORA_EVM_SUCCESS] (state) {},
  [types.SIGN_SORA_TRANSACTION_SORA_EVM_FAILURE] (state) {},
  [types.SIGN_EVM_TRANSACTION_SORA_EVM_REQUEST] (state) {},
  [types.SIGN_EVM_TRANSACTION_SORA_EVM_SUCCESS] (state) {},
  [types.SIGN_EVM_TRANSACTION_SORA_EVM_FAILURE] (state) {},
  [types.SEND_SORA_TRANSACTION_SORA_EVM_REQUEST] (state) {},
  [types.SEND_SORA_TRANSACTION_SORA_EVM_SUCCESS] (state) {},
  [types.SEND_SORA_TRANSACTION_SORA_EVM_FAILURE] (state) {},
  [types.SEND_EVM_TRANSACTION_SORA_EVM_REQUEST] (state) {},
  [types.SEND_EVM_TRANSACTION_SORA_EVM_SUCCESS] (state) {},
  [types.SEND_EVM_TRANSACTION_SORA_EVM_FAILURE] (state) {},
  [types.SIGN_SORA_TRANSACTION_EVM_SORA_REQUEST] (state) {},
  [types.SIGN_SORA_TRANSACTION_EVM_SORA_SUCCESS] (state) {},
  [types.SIGN_SORA_TRANSACTION_EVM_SORA_FAILURE] (state) {},
  [types.SIGN_EVM_TRANSACTION_EVM_SORA_REQUEST] (state) {},
  [types.SIGN_EVM_TRANSACTION_EVM_SORA_SUCCESS] (state) {},
  [types.SIGN_EVM_TRANSACTION_EVM_SORA_FAILURE] (state) {},
  [types.SEND_SORA_TRANSACTION_EVM_SORA_REQUEST] (state) {},
  [types.SEND_SORA_TRANSACTION_EVM_SORA_SUCCESS] (state) {},
  [types.SEND_SORA_TRANSACTION_EVM_SORA_FAILURE] (state) {},
  [types.SEND_EVM_TRANSACTION_EVM_SORA_REQUEST] (state) {},
  [types.SEND_EVM_TRANSACTION_EVM_SORA_SUCCESS] (state) {},
  [types.SEND_EVM_TRANSACTION_EVM_SORA_FAILURE] (state) {}
}

const actions = {
  setSoraToEvm ({ commit }, isSoraToEvm: boolean) {
    commit(types.SET_SORA_TO_EVM, isSoraToEvm)
  },
  setAssetAddress ({ commit, getters, rootGetters }, address?: string) {
    const updateBalance = (balance) => commit(types.SET_ASSET_BALANCE, balance)

    commit(types.SET_ASSET_ADDRESS, address)

    balanceSubscriptions.remove('asset', { updateBalance })

    if (rootGetters.isLoggedIn && getters.asset?.address && !(getters.asset.address in rootGetters.accountAssetsAddressTable)) {
      balanceSubscriptions.add('asset', { updateBalance, token: getters.asset })
    }
  },
  setAmount ({ commit }, amount: string) {
    commit(types.SET_AMOUNT, amount)
  },
  setSoraNetworkFee ({ commit }, soraNetworkFee: string) {
    commit(types.GET_SORA_NETWORK_FEE_SUCCESS, soraNetworkFee)
  },
  setEvmNetworkFee ({ commit }, evmNetworkFee: CodecString) {
    commit(types.GET_EVM_NETWORK_FEE_SUCCESS, evmNetworkFee)
  },
  getSoraTotal ({ commit }, soraTotal: string | number) {
    commit(types.SET_SORA_TOTAL, soraTotal)
  },
  getevmTotal ({ commit }, evmTotal: string | number) {
    commit(types.SET_EVM_TOTAL, evmTotal)
  },
  setTransactionConfirm ({ commit }, isTransactionConfirmed: boolean) {
    commit(types.SET_TRANSACTION_CONFIRM, isTransactionConfirmed)
  },
  setSoraTransactionHash ({ commit }, soraTransactionHash: string) {
    commit(types.SET_SORA_TRANSACTION_HASH, soraTransactionHash)
  },
  setEvmTransactionHash ({ commit }, evmTransactionHash: string) {
    commit(types.SET_EVM_TRANSACTION_HASH, evmTransactionHash)
  },
  setSoraTransactionDate ({ commit }, soraTransactionDate: string) {
    commit(types.SET_SORA_TRANSACTION_DATE, soraTransactionDate)
  },
  setEvmTransactionDate ({ commit }, evmTransactionDate: string) {
    commit(types.SET_EVM_TRANSACTION_DATE, evmTransactionDate)
  },
  setCurrentTransactionState ({ commit }, currentTransactionState: STATES) {
    commit(types.SET_CURRENT_TRANSACTION_STATE, currentTransactionState)
  },
  setInitialTransactionState ({ commit }, initialTransactionState: STATES) {
    commit(types.SET_INITIAL_TRANSACTION_STATE, initialTransactionState)
  },
  setTransactionStep ({ commit }, transactionStep: number) {
    commit(types.SET_TRANSACTION_STEP, transactionStep)
  },
  resetBridgeForm ({ dispatch }, withAddress = false) {
    dispatch('resetBalanceSubscription')
    if (!withAddress) {
      dispatch('setAssetAddress', '')
    }
    dispatch('setSoraToEvm', true)
    dispatch('setTransactionConfirm', false)
    dispatch('setCurrentTransactionState', STATES.INITIAL)
    dispatch('setSoraTransactionDate', '')
    dispatch('setSoraTransactionHash', '')
    dispatch('setEvmTransactionDate', '')
    dispatch('setEvmTransactionHash', '')
  },
  resetBalanceSubscription ({ commit }) {
    balanceSubscriptions.remove('asset', { updateBalance: balance => commit(types.SET_ASSET_BALANCE, balance) })
  },
  async getHistory ({ commit }) {
    commit(types.GET_HISTORY_REQUEST)
    try {
      commit(types.GET_HISTORY_SUCCESS, bridgeApi.accountHistory)
    } catch (error) {
      commit(types.GET_HISTORY_FAILURE)
      throw error
    }
  },
  async getRestoredFlag ({ commit }) {
    commit(types.GET_RESTORED_FLAG_REQUEST)
    try {
      commit(types.GET_RESTORED_FLAG_SUCCESS, api.restored)
    } catch (error) {
      commit(types.GET_RESTORED_FLAG_FAILURE)
      throw error
    }
  },
  // TODO: Need to restore transactions for all networks
  async getRestoredHistory ({ commit, getters, rootGetters }) {
    commit(types.GET_RESTORED_HISTORY_REQUEST)
    try {
      api.restored = true
      const hashes = await bridgeApi.getAccountRequests()
      if (!hashes?.length) {
        commit(types.GET_RESTORED_HISTORY_SUCCESS)
        return
      }
      const transactions = await bridgeApi.getRequests(hashes)
      if (!transactions?.length) {
        commit(types.GET_RESTORED_HISTORY_SUCCESS)
        return
      }
      const contracts = Object.values(KnownBridgeAsset).map<string>(key => rootGetters['web3/contractAddress'](key))
      const ethLogs = await getEthUserTXs(contracts)
      transactions.forEach(transaction => {
        const history = getters.history
        if (!history.length || !history.find(item => item.hash === transaction.hash)) {
          const direction = transaction.direction === BridgeDirection.Outgoing ? Operation.EthBridgeOutgoing : Operation.EthBridgeIncoming
          const ethLogData = ethLogs.find(logData => logData.soraHash === transaction.hash)
          const time = Date.now()
          bridgeApi.generateHistoryItem({
            type: direction,
            from: transaction.from,
            amount: transaction.amount,
            symbol: rootGetters['assets/registeredAssets'].find(item => item.address === transaction.soraAssetAddress)?.symbol,
            assetAddress: transaction.soraAssetAddress,
            startTime: time,
            endTime: ethLogData ? time : undefined,
            signed: !!ethLogData,
            status: ethLogData ? BridgeTxStatus.Done : BridgeTxStatus.Failed,
            transactionStep: 2,
            hash: transaction.hash,
            ethereumHash: ethLogData ? ethLogData.ethHash : '',
            transactionState: ethLogData ? STATES.EVM_COMMITED : STATES.EVM_REJECTED,
            externalNetwork: BridgeNetworks.ETH_NETWORK_ID
          })
        }
      })
      commit(types.GET_RESTORED_HISTORY_SUCCESS)
    } catch (error) {
      commit(types.GET_RESTORED_HISTORY_FAILURE)
      throw error
    }
  },
  setHistoryItem ({ commit }, historyItem: BridgeHistory | null) {
    commit(types.SET_HISTORY_ITEM, historyItem)
  },
  saveHistory ({ commit }, history: BridgeHistory) {
    api.saveHistory(history)
  },
  removeHistoryById ({ commit }, id: string) {
    if (!id.length) return
    bridgeApi.removeHistory(id)
  },
  clearHistory ({ commit }) {
    bridgeApi.clearHistory()
    commit(types.GET_HISTORY_SUCCESS, [])
  },
  findRegisteredAsset ({ commit, getters, rootGetters }) {
    return rootGetters['assets/registeredAssets'].find(item => item.address === getters.asset.address)
  },
  async getNetworkFee ({ commit, getters, dispatch }) {
    if (!getters.asset || !getters.asset.address) {
      return
    }
    commit(types.GET_SORA_NETWORK_FEE_REQUEST)
    try {
      const asset = await dispatch('findRegisteredAsset')
      const fee = await (
        getters.isSoraToEvm
          ? bridgeApi.getTransferToEthFee(asset, '', getters.amount || 0)
          : '0' // TODO: check it for other types of bridge
      )
      commit(types.GET_SORA_NETWORK_FEE_SUCCESS, fee)
    } catch (error) {
      console.error(error)
      commit(types.GET_SORA_NETWORK_FEE_FAILURE)
    }
  },
  async getEvmNetworkFee ({ commit, getters }) {
    if (!getters.asset || !getters.asset.address) {
      return
    }
    commit(types.GET_EVM_NETWORK_FEE_REQUEST)
    try {
      const web3 = await web3Util.getInstance()
      const gasPrice = +(await web3.eth.getGasPrice())
      // TODO: Add whitelist checks
      const knownAsset = KnownAssets.get(getters.asset.address) || (RegisteredAssets[getters.asset.address] && getters.asset.symbol === 'ETH')
      const gasLimit = EthereumGasLimits[+getters.isSoraToEvm][knownAsset ? getters.asset.symbol : KnownBridgeAsset.Other]
      const fee = gasPrice * gasLimit
      const fpFee = new FPNumber(web3.utils.fromWei(`${fee}`, 'ether')).toCodecString()
      commit(types.GET_EVM_NETWORK_FEE_SUCCESS, fpFee)
    } catch (error) {
      console.error(error)
      commit(types.GET_EVM_NETWORK_FEE_FAILURE)
    }
  },
  async generateHistoryItem ({ getters, dispatch, rootGetters }, playground) {
    await dispatch('setHistoryItem', bridgeApi.generateHistoryItem({
      type: getters.isSoraToEvm ? Operation.EthBridgeOutgoing : Operation.EthBridgeIncoming,
      amount: getters.amount,
      symbol: getters.asset.symbol,
      assetAddress: getters.asset.address,
      startTime: playground.date,
      endTime: playground.date,
      signed: false,
      status: '',
      transactionStep: playground.step,
      hash: '',
      ethereumHash: '',
      transactionState: STATES.INITIAL,
      soraNetworkFee: getters.soraNetworkFee.toString(),
      ethereumNetworkFee: getters.evmNetworkFee,
      externalNetwork: rootGetters['web3/evmNetwork']
    }))
    return getters.historyItem
  },
  async updateHistoryParams ({ dispatch }, params) {
    await dispatch('saveHistory', params.tx)
    await dispatch('setHistoryItem', params.tx)
    if (!params.isEndTimeOnly) {
      await dispatch('setSoraTransactionDate', params.tx.startTime)
    }
    await dispatch('setEvmTransactionDate', params.tx.endTime)
  },
  async signSoraTransactionSoraToEvm ({ commit, getters, rootGetters, dispatch }, { txId }) {
    if (!txId) throw new Error('TX ID cannot be empty!')
    if (!getters.asset || !getters.asset.address || !getters.amount || !getters.isSoraToEvm) {
      return
    }
    const asset = await dispatch('findRegisteredAsset')
    // TODO: asset should be registered just for now
    if (!asset) {
      return
    }
    commit(types.SIGN_SORA_TRANSACTION_SORA_EVM_REQUEST)
    try {
      const evmAccount = rootGetters['web3/evmAddress']
      await bridgeApi.transferToEth(asset, evmAccount, getters.amount, txId)
      commit(types.SIGN_SORA_TRANSACTION_SORA_EVM_SUCCESS)
    } catch (error) {
      commit(types.SIGN_SORA_TRANSACTION_SORA_EVM_FAILURE)
      throw error
    }
  },
  async signEvmTransactionSoraToEvm ({ commit, getters, rootGetters, dispatch }, { hash }) {
    if (!hash) throw new Error('TX ID cannot be empty!')
    checkEvmNetwork(rootGetters)
    // TODO: Check the status of TX if it was already sent
    // if (!!getters.ethereumTransactionHash) {
    //   const web3 = await web3Util.getInstance()
    //   const currentTx = await web3.eth.getTransaction(hash)
    //   if (currentTx.blockNumber) {
    //     commit(types.SEND_ETH_TRANSACTION_SORA_ETH_SUCCESS)
    //   }
    // }
    if (!getters.asset || !getters.asset.address || !getters.amount || !getters.isSoraToEvm) {
      return
    }
    const asset = await dispatch('findRegisteredAsset')
    // TODO: asset should be registered just for now
    if (!asset) {
      return
    }
    commit(types.SIGN_EVM_TRANSACTION_SORA_EVM_REQUEST)

    try {
      const request = await waitForApprovedRequest(hash) // If it causes an error, then -> catch -> SORA_REJECTED
      const web3 = await web3Util.getInstance()

      const symbol = getters.asset.symbol
      const evmAccount = rootGetters['web3/evmAddress']
      const isValOrXor = [KnownBridgeAsset.XOR, KnownBridgeAsset.VAL].includes(symbol)
      const isEthereumChain = isValOrXor && (rootGetters['web3/evmNetwork'] === BridgeNetworks.ETH_NETWORK_ID)
      const bridgeAsset: KnownBridgeAsset = isEthereumChain ? symbol : KnownBridgeAsset.Other
      const contractMap = {
        [KnownBridgeAsset.XOR]: rootGetters['web3/contractAbi'](KnownBridgeAsset.XOR),
        [KnownBridgeAsset.VAL]: rootGetters['web3/contractAbi'](KnownBridgeAsset.VAL),
        [KnownBridgeAsset.Other]: rootGetters['web3/contractAbi'](KnownBridgeAsset.Other)
      }
      const contract = contractMap[bridgeAsset]
      const jsonInterface = contract[OtherContractType.Bridge]?.abi ?? contract.abi
      const contractInstance = new web3.eth.Contract(jsonInterface)
      const contractAddress = rootGetters['web3/contractAddress'](bridgeAsset)
      contractInstance.options.address = contractAddress
      const method = isEthereumChain
        ? 'mintTokensByPeers'
        : request.currencyType === BridgeCurrencyType.TokenAddress
          ? 'receiveByEthereumAssetAddress'
          : 'receiveBySidechainAssetId'
      const methodArgs = [
        (isEthereumChain || request.currencyType === BridgeCurrencyType.TokenAddress)
          ? asset.externalAddress // address tokenAddress OR
          : asset.address, // bytes32 assetId
        new FPNumber(getters.amount, asset.externalDecimals).toCodecString(), // uint256 amount
        evmAccount // address beneficiary
      ]
      methodArgs.push(...(isEthereumChain
        ? [
          hash, // bytes32 txHash
          request.v, // uint8[] memory v
          request.r, // bytes32[] memory r
          request.s, // bytes32[] memory s
          request.from // address from
        ] : [
          request.from, // address from
          hash, // bytes32 txHash
          request.v, // uint8[] memory v
          request.r, // bytes32[] memory r
          request.s // bytes32[] memory s
        ])
      )
      checkEvmNetwork(rootGetters)
      const contractMethod = contractInstance.methods[method](...methodArgs)
      const gas = await contractMethod.estimateGas()
      return new Promise((resolve, reject) => {
        contractMethod.send({ gas, from: evmAccount })
          .on('transactionHash', hash => {
            commit(types.SIGN_EVM_TRANSACTION_SORA_EVM_SUCCESS)
            resolve(hash)
          })
          .on('error', (error) => reject(error))
      })
    } catch (error) {
      commit(types.SIGN_EVM_TRANSACTION_SORA_EVM_FAILURE)
      throw error
    }
  },
  async sendSoraTransactionSoraToEvm ({ commit }, { txId }) {
    if (!txId) throw new Error('TX ID cannot be empty!')
    commit(types.SEND_SORA_TRANSACTION_SORA_EVM_REQUEST)
    try {
      const tx = await waitForExtrinsicFinalization(txId)
      commit(types.SEND_SORA_TRANSACTION_SORA_EVM_SUCCESS)
      return tx.hash
    } catch (error) {
      commit(types.SEND_SORA_TRANSACTION_SORA_EVM_FAILURE)
      throw error
    }
  },
  async sendEvmTransactionSoraToEvm ({ commit }, { ethereumHash }) {
    if (!ethereumHash) throw new Error('Hash cannot be empty!')
    commit(types.SEND_EVM_TRANSACTION_SORA_EVM_REQUEST)
    try {
      await waitForEvmTransactionStatus(ethereumHash)
      commit(types.SEND_EVM_TRANSACTION_SORA_EVM_SUCCESS)
    } catch (error) {
      commit(types.SEND_EVM_TRANSACTION_SORA_EVM_FAILURE)
      throw error
    }
  },
  async signEvmTransactionEvmToSora ({ commit, getters, rootGetters, dispatch }) {
    if (!getters.asset || !getters.asset.address || !getters.amount || getters.isSoraToEvm) {
      return
    }
    checkEvmNetwork(rootGetters)
    // TODO: Check the status of TX if it was already sent
    // if (!!getters.ethereumTransactionHash) {
    //   const web3 = await web3Util.getInstance()
    //   const currentTx = await web3.eth.getTransaction(hash)
    //   if (currentTx.blockNumber) {
    //     commit(types.SEND_ETH_TRANSACTION_ETH_SORA_SUCCESS)
    //   }
    // }
    const asset = await dispatch('findRegisteredAsset')
    // TODO: asset should be registered for now (ERC-20 tokens flow)
    if (!asset) {
      return
    }
    commit(types.SIGN_EVM_TRANSACTION_EVM_SORA_REQUEST)

    try {
      const contract = rootGetters['web3/contractAbi'](KnownBridgeAsset.Other)
      const evmAccount = rootGetters['web3/evmAddress']
      const isExternalAccountConnected = await web3Util.checkAccountIsConnected(evmAccount)
      if (!isExternalAccountConnected) {
        await dispatch('web3/disconnectExternalAccount', {}, { root: true })
        throw new Error('Connect account in Metamask')
      }
      const web3 = await web3Util.getInstance()
      const contractAddress = rootGetters['web3/contractAddress'](KnownBridgeAsset.Other)
      const isNativeEvmToken = isEthereumAddress(asset.externalAddress)

      // don't check allowance for native EVM token
      if (!isNativeEvmToken) {
        const allowance = await dispatch('web3/getAllowanceByEvmAddress', { address: asset.externalAddress }, { root: true })
        if (FPNumber.lte(new FPNumber(allowance), new FPNumber(getters.amount))) {
          const tokenInstance = new web3.eth.Contract(contract[OtherContractType.ERC20].abi)
          tokenInstance.options.address = asset.externalAddress
          const methodArgs = [
            contractAddress, // address spender
            MaxUint256 // uint256 amount
          ]
          checkEvmNetwork(rootGetters)
          const approveMethod = tokenInstance.methods.approve(...methodArgs)
          await approveMethod.send({ from: evmAccount })
        }
      }

      const soraAccountAddress = rootGetters.account.address
      const accountId = await web3Util.accountAddressToHex(soraAccountAddress)
      const contractInstance = new web3.eth.Contract(contract[OtherContractType.Bridge].abi)
      contractInstance.options.address = contractAddress

      const decimals = isNativeEvmToken
        ? undefined
        : await (async () => {
          const tokenInstance = new web3.eth.Contract(ABI.balance as any)
          tokenInstance.options.address = asset.externalAddress
          const decimalsMethod = tokenInstance.methods.decimals()
          const decimals = await decimalsMethod.call()

          return +decimals
        })()

      const amount = new FPNumber(getters.amount, decimals).toCodecString()

      const method = isNativeEvmToken ? 'sendEthToSidechain' : 'sendERC20ToSidechain'
      const methodArgs = isNativeEvmToken ? [
        accountId // bytes32 to
      ] : [
        accountId, // bytes32 to
        amount, // uint256 amount
        asset.externalAddress // address tokenAddress
      ]
      const contractMethod = contractInstance.methods[method](...methodArgs)

      const sendArgs = isNativeEvmToken
        ? { from: evmAccount, value: amount }
        : { from: evmAccount }

      checkEvmNetwork(rootGetters)
      return new Promise((resolve, reject) => {
        contractMethod.send(sendArgs)
          .on('transactionHash', hash => {
            commit(types.SIGN_EVM_TRANSACTION_EVM_SORA_SUCCESS)
            resolve(hash)
          })
          .on('error', (error) => reject(error))
      })
    } catch (error) {
      commit(types.SIGN_EVM_TRANSACTION_EVM_SORA_FAILURE)
      console.error(error)
      throw error
    }
  },
  async sendEvmTransactionEvmToSora ({ commit }, { ethereumHash }) {
    if (!ethereumHash) throw new Error('Hash cannot be empty!')
    commit(types.SEND_EVM_TRANSACTION_EVM_SORA_REQUEST)
    try {
      await waitForEvmTransactionStatus(ethereumHash)
      commit(types.SEND_EVM_TRANSACTION_EVM_SORA_SUCCESS)
    } catch (error) {
      commit(types.SEND_EVM_TRANSACTION_EVM_SORA_FAILURE)
      throw error
    }
  },
  async signSoraTransactionEvmToSora ({ commit, getters, dispatch }, { ethereumHash }) {
    if (!ethereumHash) throw new Error('Hash cannot be empty!')
    if (!getters.asset || !getters.asset.address || !getters.amount || getters.isSoraToEvm) {
      return
    }
    const asset = await dispatch('findRegisteredAsset')
    // TODO: asset should be registered just for now
    if (!asset) {
      return
    }
    commit(types.SIGN_SORA_TRANSACTION_EVM_SORA_REQUEST)

    try {
      // TODO: check it for other types of bridge
      // const transferType = isXorAccountAsset(getters.asset) ? RequestType.TransferXOR : RequestType.Transfer
      // await bridgeApi.requestFromEth(ethereumHash, transferType)
      commit(types.SIGN_SORA_TRANSACTION_EVM_SORA_SUCCESS)
    } catch (error) {
      commit(types.SIGN_SORA_TRANSACTION_EVM_SORA_FAILURE)
      console.error(error)
      throw error
    }
  },
  async sendSoraTransactionEvmToSora ({ commit }, { ethereumHash }) {
    if (!ethereumHash) throw new Error('Hash cannot be empty!')
    commit(types.SEND_SORA_TRANSACTION_EVM_SORA_REQUEST)
    try {
      await waitForRequest(ethereumHash)
      commit(types.SEND_SORA_TRANSACTION_EVM_SORA_SUCCESS)
    } catch (error) {
      commit(types.SEND_SORA_TRANSACTION_EVM_SORA_FAILURE)
      console.error(error)
      throw error
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
