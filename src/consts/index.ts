import invert from 'lodash/fp/invert'
import { LiquiditySourceTypes } from '@sora-substrate/util'

import pkg from '../../package.json'

export const app = {
  version: pkg.version,
  name: 'Polkaswap',
  email: 'jihoon@tutanota.de'
}

export const WalletPermissions = {
  sendAssets: true, // enable 'send' button in assets list
  swapAssets: true // enable 'swap' button in assets list
}

export enum Language {
  EN = 'en'
}

export const Links = {
  about: {
    sora: 'https://sora.org/',
    polkadot: 'https://medium.com/polkadot-network/polkadot-js-extension-release-update-3b0d2d87edb8'
  },
  nodes: {
    tutorial: 'https://medium.com/sora-xor/how-to-run-a-sora-testnet-node-a4d42a9de1af'
  }
}

export const ObjectInit = () => null

export const ZeroStringValue = '0'

export const DefaultSlippageTolerance = '0.5'

export enum MarketAlgorithms {
  SMART = 'SMART',
  TBC = 'TBC',
  XYK = 'XYK'
}

export const DefaultMarketAlgorithm = MarketAlgorithms.SMART

export const LiquiditySourceForMarketAlgorithm = {
  [MarketAlgorithms.SMART]: LiquiditySourceTypes.Default,
  [MarketAlgorithms.TBC]: LiquiditySourceTypes.MulticollateralBondingCurvePool,
  [MarketAlgorithms.XYK]: LiquiditySourceTypes.XYKPool
}

export const MarketAlgorithmForLiquiditySource = invert(LiquiditySourceForMarketAlgorithm)

export enum PageNames {
  Exchange = 'Exchange',
  Send = 'Send',
  Pool = 'Pool',
  Wallet = 'Wallet',
  CreatePair = 'CreatePair',
  AddLiquidity = 'AddLiquidity',
  AddLiquidityId = 'AddLiquidityId',
  RemoveLiquidity = 'RemoveLiquidity',
  KYC = 'KYC'
}

export enum Components {
  GenericPageHeader = 'GenericPageHeader',
  SwapInfo = 'SwapInfo',
  InfoLine = 'InfoLine',
  InfoCard = 'InfoCard',
  SelectToken = 'SelectToken',
  ResultDialog = 'ResultDialog',
  TokenLogo = 'TokenLogo',
  PairTokenLogo = 'PairTokenLogo',
  ConfirmSwap = 'ConfirmSwap',
  ConfirmRemoveLiquidity = 'ConfirmRemoveLiquidity',
  ConfirmTokenPairDialog = 'ConfirmTokenPairDialog',
  SettingsDialog = 'SettingsDialog',
  SettingsHeader = 'Settings/Header',
  SettingsTabs = 'Settings/Tabs',
  SlippageTolerance = 'Settings/SlippageTolerance',
  MarketAlgorithm = 'Settings/MarketAlgorithm',
  SelectNode = 'Settings/Node/SelectNode',
  NodeInfo = 'Settings/Node/NodeInfo',
  SelectNodeDialog = 'SelectNodeDialog',
  StatusActionBadge = 'StatusActionBadge',
  ExternalLink = 'ExternalLink',
  HelpDialog = 'HelpDialog',
  AboutNetworkDialog = 'AboutNetworkDialog',
  SidebarItemContent = 'SidebarItemContent',
  ToggleTextButton = 'ToggleTextButton',
  TokenSelectButton = 'Input/TokenSelectButton',
  TokenAddress = 'Input/TokenAddress'
}

interface SidebarMenuItem {
  icon: string;
  title: string;
  disabled?: boolean;
}

interface SidebarMenuItemLink extends SidebarMenuItem {
  href?: string;
}

const MainMenu: Array<SidebarMenuItem> = [
  {
    icon: 'basic-drop-24',
    title: PageNames.Pool
  },
  {
    icon: 'arrows-swap-90-24',
    title: PageNames.Exchange
  },
  {
    icon: 'finance-send-24',
    title: PageNames.Send
  }
]

const AccountMenu: Array<SidebarMenuItem> = [
  {
    icon: 'finance-wallet-24',
    title: PageNames.Wallet
  }
]

const OtherPagesMenu: Array<SidebarMenuItem> = [
  {
    icon: 'finance-wallet-24',
    title: PageNames.KYC
  }
]

export const FaucetLink: SidebarMenuItemLink = {
  icon: 'software-terminal-24',
  title: 'faucet'
}

export const SidebarMenuGroups = [
  OtherPagesMenu,
  AccountMenu,
  MainMenu
]

export enum LogoSize {
  MINI = 'mini',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large'
}

export enum InfoTooltipPosition {
  LEFT = 'left',
  RIGHT = 'right'
}

export enum NetworkTypes {
  Devnet = 'Devnet',
  Testnet = 'Testnet',
  Mainnet = 'Mainnet'
}
