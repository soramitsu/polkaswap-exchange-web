import { en as walletEn } from '@soramitsu/soraneo-wallet-web'
import { Operation, TransactionStatus, RewardingEvents } from '@sora-substrate/util'

import { PageNames, NetworkTypes } from '../consts'

export default {
  // Wallet project keys
  ...walletEn,
  // Polkaswap project keys
  appName: 'Polkaswap',
  soraText: 'SORA',
  ethereumText: 'Ethereum',
  changeNetworkText: 'Change network in Metamask',
  transactionText: 'transaction | transactions',
  transactionSubmittedText: 'Transaction was submitted',
  unknownErrorText: 'ERROR Something went wrong...',
  connectWalletText: 'Connect account',
  changeAccountText: 'Change account',
  connectedText: 'Connected',
  connectWalletTextTooltip: 'Connect to @:soraText Network with polkadot{.js}',
  selectNodeText: 'Select node',
  comingSoonText: 'Coming Soon',
  disclaimer: 'Disclaimer: This website is maintained by the @:soraText community. Before continuing to use this website, please review the @:polkaswapFaqLink and documentation, which includes a detailed explanation on how Polkaswap works, as well as the @:footerMenu.memorandum, and @:(footerMenu.privacy). These documents are crucial to a secure and positive user experience. By using Polkaswap, you acknowledge that you have read and understand these documents. You also acknowledge the following: 1) your sole responsibility for compliance with all laws that may apply to your particular use of Polkaswap in your legal jurisdiction; 2) your understanding that the current version of Polkaswap is an alpha version: it has not been fully tested, and some functions may not perform as designed; and 3) your understanding and voluntary acceptance of the risks involved in using Polkaswap, including, but not limited to, the risk of losing tokens. Once more, please do not continue without reading the FAQ, <span>@:footerMenu.memorandum</span><a href="@:helpDialog.termsOfServiceLink" target="_blank" rel="nofollow noopener" class="link link--mobile">@:footerMenu.memorandum</a>, and <span>@:footerMenu.privacy</span><a href="@:helpDialog.privacyPolicyLink" target="_blank" rel="nofollow noopener" class="link link--mobile">@:footerMenu.privacy</a>!',
  polkaswapFaqLink: '<a class="link" href="https://wiki.sora.org/polkaswap/polkaswap-faq" target="_blank" rel="nofollow noopener" title="Polkaswap FAQ">Polkaswap FAQ</a>',
  poweredBy: 'Powered by',
  confirmText: 'Confirm',
  confirmTransactionText: 'Confirm transaction in {direction}',
  retryText: 'Retry',
  networkFeeText: 'Network Fee',
  networkFeeTooltipText: 'Network fee is used to ensure @:soraText system\'s growth and stable performance.',
  ethNetworkFeeTooltipText: 'Please note that the Ethereum network fees displayed on Polkaswap are only rough estimations, you can see the correct fee amount in your connected Ethereum wallet prior to confirming the transaction.',
  marketText: 'Market',
  marketAlgorithmText: 'Market algorithm',
  insufficientBalanceText: 'Insufficient {tokenSymbol} balance',
  firstPerSecond: '{first} per {second}',
  pairIsNotCreated: 'Token pair isn\'t created',
  nameText: 'Name',
  addressText: 'Address',
  pageTitle: {
    [PageNames.Exchange]: 'Exchange',
    [PageNames.Send]: 'Send',
    [PageNames.Pool]: 'Pool',
    [PageNames.Wallet]: 'Wallet',
    [PageNames.CreatePair]: 'Create Pair',
    [PageNames.AddLiquidity]: 'Add Liquidity',
    [PageNames.AddLiquidityId]: 'Add Liquidity',
    [PageNames.RemoveLiquidity]: 'Remove Liquidity',
    [PageNames.KYC]: 'KYC'
  },
  mainMenu: {
    [PageNames.Exchange]: 'Exchange',
    [PageNames.Send]: 'Send',
    [PageNames.Pool]: 'Pool',
    [PageNames.Wallet]: 'Account',
    [PageNames.KYC]: 'KYC'
  },
  footerMenu: {
    faucet: 'Faucet',
    github: 'GitHub',
    sorawiki: '@:soraText Wiki',
    memorandum: 'Polkaswap Memorandum and Terms of Services',
    privacy: 'Privacy Policy'
  },
  helpDialog: {
    title: 'Help',
    termsOfService: 'Terms of Service',
    privacyPolicy: 'Privacy Policy',
    termsOfServiceLink: 'https://www.notion.so/Polkaswap-Memorandum-and-Terms-of-Services-dc7f815a6d0a497a924832cc9bda17b8', // 'https://polkaswap.io/terms',
    privacyPolicyLink: 'https://www.notion.so/Polkaswap-Privacy-Policy-d0f26456f2974f0d94734b19f6e5fc70', // 'https://polkaswap.io/privacy',
    appVersion: '@:appName version',
    contactUs: 'Contact us'
  },
  aboutNetworkDialog: {
    title: 'About',
    learnMore: 'Learn more',
    network: {
      title: 'What is @:soraText?',
      description: 'Polkaswap is built on top of the @:soraText Network, and the @:soraText token (XOR) is used for gas/fees and liquidity provision on Polkaswap. @:soraText Network allows for reduced fees, faster transactions and simpler consensus finalization and is focused on delivering interoperability across other blockchain ecosystems like @:(ethereumText).'
    },
    polkadot: {
      title: 'What is polkadot{.js}?',
      description: 'Polkadot{.js} extension is a browser extension available for Firefox and Chrome dedicated to managing accounts for Substrate-based chains, including @:soraText, Polkadot and Kusama. You can add, import, and export accounts and sign transactions or extrinsics that you have initiated from websites you have authorized.'
    }
  },
  node: {
    errors: {
      connection: 'An error occurred while connecting to the node\n{address}\n',
      network: 'The node\n{address}\n is from the another network\n',
      existing: 'This node is already added: \'{title}\'\n'
    },
    warnings: {
      disconnect: 'Сonnection to the node has been lost. Reconnecting...'
    },
    messages: {
      connected: 'Connection estabilished with node\n{address}\n',
      selectNode: 'Please select node to connect from the node list'
    }
  },
  selectNodeDialog: {
    title: '@:soraText Network node selection',
    addNode: 'Add custom node',
    customNode: 'Custom node',
    howToSetupOwnNode: 'How to setup your own @:soraText node',
    select: 'Select',
    connected: 'Connected',
    selectNodeForEnvironment: 'Select a node for {environment} environment:',
    nodeTitle: '{chain} hosted by {name}',
    messages: {
      emptyName: 'Please input the name of the node',
      emptyAddress: 'Please input the address of the node',
      incorrectProtocol: 'Address should starts from ws:// or wss://',
      incorrectAddress: 'Incorrect address'
    }
  },
  buttons: {
    max: 'MAX',
    chooseToken: 'Choose token',
    chooseAToken: 'Choose a token',
    chooseTokens: 'Choose tokens',
    enterAmount: 'Enter amount'
  },
  transfers: {
    from: 'From',
    to: 'To'
  },
  operations: {
    [Operation.Swap]: 'Swap',
    [Operation.Transfer]: 'Transfer',
    [Operation.AddLiquidity]: 'Add Liquidity',
    [Operation.RemoveLiquidity]: 'Remove Liquidity',
    [Operation.CreatePair]: 'Create Pair',
    [Operation.RegisterAsset]: 'Register Asset',
    [Operation.ClaimRewards]: 'Claim Rewards',
    andText: 'and',
    [TransactionStatus.Finalized]: {
      [Operation.Transfer]: 'Sent {amount} {symbol} to {address}',
      [Operation.Swap]: 'Swapped {amount} {symbol} for {amount2} {symbol2}',
      [Operation.AddLiquidity]: 'Supplied {amount} {symbol} and {amount2} {symbol2}',
      [Operation.RemoveLiquidity]: 'Removed {amount} {symbol} and {amount2} {symbol2}',
      [Operation.CreatePair]: 'Supplied {amount} {symbol} and {amount2} {symbol2}',
      [Operation.RegisterAsset]: 'Registered {symbol} asset',
      [Operation.ClaimRewards]: 'Reward claimed successfully {rewards}'
    },
    [TransactionStatus.Error]: {
      [Operation.Transfer]: 'Failed to send {amount} {symbol} to {address}',
      [Operation.Swap]: 'Failed to swap {amount} {symbol} for {amount2} {symbol2}',
      [Operation.AddLiquidity]: 'Failed to supply {amount} {symbol} and {amount2} {symbol2}',
      [Operation.RemoveLiquidity]: 'Failed to remove {amount} {symbol} and {amount2} {symbol2}',
      [Operation.CreatePair]: 'Failed to supply {amount} {symbol} and {amount2} {symbol2}',
      [Operation.RegisterAsset]: 'Failed to register {symbol} asset',
      [Operation.ClaimRewards]: 'Failed to claim rewards {rewards}'
    }
  },
  metamask: 'MetaMask',
  sora: {
    [NetworkTypes.Devnet]: '@:soraText Devnet',
    [NetworkTypes.Testnet]: '@:soraText Testnet',
    [NetworkTypes.Mainnet]: '@:soraText Mainnet'
  },
  providers: {
    metamask: '@:metamask'
  },
  exchange: {
    [PageNames.Exchange]: 'Exchange',
    [PageNames.Send]: 'Send',
    [PageNames.Pool]: 'Pool',
    balance: 'Balance',
    insufficientBalance: '@:insufficientBalanceText',
    price: 'Price',
    transactionSubmitted: 'Transaction submitted',
    transactionMessage: '{firstToken} and {secondToken}',
    confirm: 'Confirm',
    ok: 'OK'
  },
  swap: {
    connectWallet: '@:connectWalletText',
    estimated: 'estimated',
    slippageTolerance: 'Slippage Tolerance',
    minReceived: 'Minimum Received',
    maxSold: 'Maximum Sold',
    minReceivedTooltip: 'Your transaction will revert if there is a large, unfavorable price movement before it is confirmed.',
    priceImpact: 'Price Impact',
    priceImpactTooltip: 'The difference between the market price and estimated price due to trade size.',
    liquidityProviderFee: 'Liquidity Provider Fee',
    liquidityProviderFeeTooltip: 'A portion of each trade ({liquidityProviderFee}%) goes to liquidity providers as a protocol incentive.',
    networkFee: '@:networkFeeText',
    pairIsNotCreated: '@:pairIsNotCreated',
    networkFeeTooltip: '@:networkFeeTooltipText',
    firstPerSecond: '@:firstPerSecond',
    insufficientAmount: 'Insufficient {tokenSymbol} amount',
    insufficientLiquidity: 'Insufficient liquidity',
    confirmSwap: 'Confirm swap',
    swapOutputMessage: 'Output is estimated. You will receive <span class="min-received-label">at least</span> {transactionValue} or the transaction will revert.',
    rewardsForSwap: 'PSWAP Strategic Rewards'
  },
  pool: {
    connectWallet: '@:connectWalletText',
    connectToWallet: 'Connect to a wallet to add and view your liquidity.',
    liquidityNotFound: 'No liquidity found.',
    addLiquidity: 'Add liquidity',
    removeLiquidity: 'Remove liquidity',
    createPair: 'Create a pair',
    pooledToken: '{tokenSymbol} Pooled',
    pairTokens: '{pair} Pool Tokens',
    poolShare: 'Your pool share',
    unknownAsset: 'Unknown asset',
    description: 'When you add liquidity, you are given pool tokens representing your position. These tokens automatically earn fees proportional to your share of the pool, and can be redeemed at any time.'
  },
  months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  selectToken: {
    title: 'Select a token',
    searchPlaceholder: 'Filter by Asset ID, Name or Ticker Symbol',
    emptyListMessage: 'No results',
    copy: 'Copy Asset ID',
    successCopy: '{symbol} Asset ID is copied to the clipboard',
    assets: {
      title: 'Assets'
    },
    custom: {
      title: 'Custom',
      search: 'Search by Asset ID',
      text: 'CUSTOM TOKENS',
      alreadyAttached: 'This token was already attached',
      notFound: 'Token not found'
    }
  },
  createPair: {
    title: 'Create a pair',
    deposit: 'Deposit',
    balance: 'Balance',
    pricePool: 'Prices and pool share',
    shareOfPool: 'Share of pool',
    firstPerSecond: '@:firstPerSecond',
    firstSecondPoolTokens: '{first}-{second} Pool tokens',
    connect: 'Connect wallet',
    supply: 'Supply',
    yourPosition: 'Your position',
    yourPositionEstimated: 'Your position (estimated)',
    youWillReceive: 'You will receive',
    remove: 'remove',
    add: 'ADD',
    ok: 'OK',
    networkFee: 'Network fee',
    alreadyCreated: 'Token pair is already created',
    firstLiquidityProvider: 'You are the first liquidity provider',
    firstLiquidityProviderInfo: 'The ratio of tokens you add will set the price of this pool.<br/>Once you are happy with the rate click supply to review.'
  },
  confirmSupply: {
    title: 'You will receive',
    outputDescription: 'Output is estimated. If the price changes more than {slippageTolerance}% your transaction will revert.',
    poolTokensBurned: '{first}-{second} Pool Tokens Burned',
    price: 'Price'
  },
  addLiquidity: {
    title: 'Add liquidity',
    pairIsNotCreated: '@:pairIsNotCreated',
    firstPerSecond: '@:firstPerSecond'
  },
  removeLiquidity: {
    title: 'Remove liquidity',
    liquidity: 'liquidity',
    balance: 'Balance',
    amount: 'Amount',
    input: 'Input',
    output: 'Output',
    price: 'Price',
    remove: 'Remove',
    description: 'Removing pool tokens converts your position back into underlying tokens at the current rate, proportional to your share of the pool. Accrued fees are included in the amounts you receive.',
    outputMessage: 'Output is estimated. If the price changes more than {slippageTolerance}% your transaction will revert.',
    confirmTitle: 'You will receive'
  },
  dexSettings: {
    title: 'Transaction settings',
    marketAlgorithm: '@.upper:marketAlgorithmText',
    marketAlgorithms: {
      SMART: '<span class="algorithm">SMART</span> liquidity routing ensures the best price for any transaction by combining only the best price options from all available markets. When available, Token Bonding Curve (<span class="algorithm">TBC</span>) will be used for liquidity as long as the asset price is more affordable than from other sources, upon which the <span class="algorithm">XYK</span> pool is utilized.',
      TBC: '<span class="algorithm">TBC</span> — buying only from the Token Bonding Curve (Primary Market). There is a possibility that the price can become unfavorable compared to the <span class="algorithm">XYK</span> pool (Secondary Market), but the value received from the vested rewards might turn out to be much more favorable over time.',
      XYK: '<span class="algorithm">XYK</span> — buying only from the XYK Pool (Secondary Market). Traditional XYK pool swap.'
    },
    marketAlgorithmTooltip: {
      main: ' - option to choose between Primary Market (TBC), Secondary Market (XYK) or a combined smart algorithm for guaranteed best price for any given transaction.'
    },
    slippageTolerance: 'SLIPPAGE TOLERANCE',
    slippageToleranceHint: 'Your transaction will revert if the price changes unfavorably by more than this percentage.',
    slippageToleranceValidation: {
      warning: 'Your transaction may fail',
      frontrun: 'Your transaction may be frontrun',
      error: 'Enter a valid slippage percentage'
    },
    custom: 'CUSTOM',
    transactionDeadline: 'TRANSACTION DEADLINE',
    transactionDeadlineHint: 'Transaction will be cancelled if it is pending for more than this long.',
    nodeAddress: 'NODE ADDRESS',
    ip: 'IP',
    port: 'PORT',
    min: 'MIN'
  },
  resultDialog: {
    title: 'Transaction submitted',
    ok: 'OK'
  }
}
