import { celo } from "viem/chains";

export const CHAIN = celo;

export const DEFAULT_RPC_URL = "https://forno.celo.org";

export const KNOWN_TOKENS: Record<
  string,
  { address: `0x${string}`; symbol: string; decimals: number }
> = {
  CELO: {
    address: "0x471EcE3750Da237f93B8E339c536991b8978A438",
    symbol: "CELO",
    decimals: 18,
  },
  cUSD: {
    address: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
    symbol: "cUSD",
    decimals: 18,
  },
  cEUR: {
    address: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73",
    symbol: "cEUR",
    decimals: 18,
  },
  cREAL: {
    address: "0xE918F6463995C2d9915D9E2275BEaef0175610E4",
    symbol: "cREAL",
    decimals: 18,
  },
};
