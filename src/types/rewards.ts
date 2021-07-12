import { KnownSymbols, RewardInfo, RewardingEvents, CodecString, Asset } from '@sora-substrate/util'

export interface RewardsAmountHeaderItem {
  amount: string;
  symbol: KnownSymbols;
}

export interface RewardInfoGroup {
  type: RewardingEvents | string;
  limit: Array<RewardsAmountHeaderItem>;
  total?: RewardsAmountHeaderItem;
  title?: string;
  rewards?: Array<RewardInfo>;
}

export interface RewardsAmountTableItem {
  type?: string;
  title?: string;
  subtitle?: string;
  limit?: Array<RewardsAmountHeaderItem>;
  rewards?: Array<RewardsAmountTableItem>;
}
