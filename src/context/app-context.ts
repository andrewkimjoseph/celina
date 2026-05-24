import type { CeloClientFactory } from "../clients/celo-client.js";
import { BlockchainService } from "../services/blockchain.service.js";
import { AccountService } from "../services/account.service.js";
import { TokenService } from "../services/token.service.js";
import { TransactionService } from "../services/transaction.service.js";
import { GoodDollarService } from "../services/gooddollar.service.js";

export interface AppContext {
  config: {
    hasWallet: boolean;
    walletAddress?: `0x${string}`;
  };
  blockchain: BlockchainService;
  account: AccountService;
  token: TokenService;
  transaction: TransactionService;
  gooddollar: GoodDollarService;
}

export function createAppContext(
  clientFactory: CeloClientFactory,
  walletAddress?: `0x${string}`,
): AppContext {
  return {
    config: {
      hasWallet: Boolean(walletAddress),
      walletAddress,
    },
    blockchain: new BlockchainService(clientFactory),
    account: new AccountService(clientFactory),
    token: new TokenService(clientFactory),
    transaction: new TransactionService(clientFactory),
    gooddollar: new GoodDollarService(clientFactory),
  };
}
