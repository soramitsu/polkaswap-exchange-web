export const AppName = 'Polkaswap'

export enum PageNames {
  About = 'About',
  Exchange = 'Exchange',
  Swap = 'Swap',
  Pool = 'Pool',
  Stats = 'Stats',
  Support = 'Support',
  Wallet = 'Wallet',
  CreatePair = 'CreatePair',
  AddLiquidity = 'AddLiquidity',
  RemoveLiquidity = 'RemoveLiquidity'
}

export enum Components {
  SwapInfo = 'SwapInfo',
  SelectToken = 'SelectToken',
  TokenLogo = 'TokenLogo',
  ConfirmSwap = 'ConfirmSwap',
  TransactionSubmit = 'TransactionSubmit',
  ConfirmCreatePair = 'ConfirmCreatePair',
  CreatePairSubmit = 'CreatePairSubmit',
  PairTokenLogo = 'PairTokenLogo',
  InfoCard = 'InfoCard',
  Settings = 'Settings'
}

export const MainMenu = [
  PageNames.About,
  PageNames.Exchange,
  PageNames.Stats,
  PageNames.Support
]

export const ExchangeTabs = [
  PageNames.Swap,
  PageNames.Pool
]

export enum Topics {
  SwapTokens = 'SwapTokens',
  PassiveEarning = 'PassiveEarning',
  AddLiquidity = 'AddLiquidity',
  PriceFeeds = 'PriceFeeds'
}

export const AboutTopics = [
  { title: Topics.SwapTokens, icon: 'swap' },
  { title: Topics.PassiveEarning, icon: 'earn' },
  { title: Topics.AddLiquidity, icon: 'liquidity' },
  { title: Topics.PriceFeeds, icon: 'build' }
]

export enum LogoSize {
  MINI = 'mini',
  SMALL = 'small',
  MEDIUM = 'medium',
}
