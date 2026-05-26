export interface AppConfig {
  rpcUrl: string;
  ethRpcUrl?: string;
  privateKey?: `0x${string}`;
  selfAgentPrivateKey?: `0x${string}`;
}

export function loadConfig(): AppConfig {
  return {
    rpcUrl: process.env.CELO_RPC_URL_MAINNET ?? "https://forno.celo.org",
    ethRpcUrl: process.env.ETH_RPC_URL_MAINNET,
    privateKey: process.env.CELO_PRIVATE_KEY as `0x${string}` | undefined,
    selfAgentPrivateKey: process.env.SELF_AGENT_PRIVATE_KEY as
      | `0x${string}`
      | undefined,
  };
}
