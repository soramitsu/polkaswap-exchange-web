import { ProviderInterfaceEmitted, ProviderInterfaceEmitCb } from '@polkadot/rpc-provider/types'

export interface Node {
  chain: string;
  name: string;
  address: string;
}

export interface NodeItem extends Node {
  title?: string;
  connecting?: boolean;
}

export interface RunConnectionOptions {
  once?: boolean;
  timeout?: number;
  eventListeners?: Array<[ProviderInterfaceEmitted, ProviderInterfaceEmitCb]>;
}

export interface ConnectToNodeOptions {
  node?: Node;
  connectionOptions?: RunConnectionOptions;
  onError?: Function;
  onReconnect?: Function;
  onDisconnect?: Function;
}
