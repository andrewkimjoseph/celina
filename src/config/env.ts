export interface AppConfig {
  rpcUrl: string;
  privateKey?: `0x${string}`;
}

export function loadConfig(): AppConfig {
  return {
    rpcUrl: process.env.CELO_RPC_URL_MAINNET ?? "https://forno.celo.org",
    privateKey: process.env.CELO_PRIVATE_KEY as `0x${string}` | undefined,
  };
}
