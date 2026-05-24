import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { AppConfig } from "../config/env.js";
import { CHAIN, DEFAULT_RPC_URL } from "../config/chains.js";

export interface CeloClients {
  public: PublicClient;
  wallet?: WalletClient;
  accountAddress?: `0x${string}`;
}

export class CeloClientFactory {
  private clients: CeloClients | null = null;

  constructor(private readonly config: AppConfig) {}

  getClients(): CeloClients {
    if (this.clients) {
      return this.clients;
    }

    const rpcUrl = this.config.rpcUrl ?? DEFAULT_RPC_URL;
    const transport = http(rpcUrl);
    const publicClient = createPublicClient({
      chain: CHAIN,
      transport,
    }) as PublicClient;

    let wallet: WalletClient | undefined;
    let accountAddress: `0x${string}` | undefined;

    if (this.config.privateKey) {
      const account = privateKeyToAccount(this.config.privateKey);
      accountAddress = account.address;
      wallet = createWalletClient({
        account,
        chain: CHAIN,
        transport,
      });
    }

    this.clients = {
      public: publicClient,
      wallet,
      accountAddress,
    };

    return this.clients;
  }

  getClientsForAccount(privateKey: `0x${string}`): CeloClients {
    const rpcUrl = this.config.rpcUrl ?? DEFAULT_RPC_URL;
    const transport = http(rpcUrl);
    const publicClient = createPublicClient({
      chain: CHAIN,
      transport,
    }) as PublicClient;
    const account = privateKeyToAccount(privateKey);

    const wallet = createWalletClient({
      account,
      chain: CHAIN,
      transport,
    });

    return {
      public: publicClient,
      wallet,
      accountAddress: account.address,
    };
  }
}
