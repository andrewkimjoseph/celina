import { supply, withdraw } from "@aave/client/actions";
import { bigDecimal, chainId, evmAddress } from "@aave/types";
import { erc20Abi } from "viem";
import type { CeloClientFactory, CeloClients } from "../clients/celo-client.js";
import { aaveClient } from "../clients/aave-client.js";
import { sendExecutionPlan } from "../clients/aave-send.js";
import {
  AAVE_CHAIN_ID,
  AAVE_POOL,
  AAVE_USDT,
  AAVE_USDT_A_TOKEN,
} from "../config/aave.js";
import { decryptPrivateKey } from "../crypto/wallet-key-crypto.js";
import { TokenService } from "./token.service.js";

export class AaveService {
  private readonly tokenService: TokenService;

  constructor(private readonly clientFactory: CeloClientFactory) {
    this.tokenService = new TokenService(clientFactory);
  }

  private resolveClients(encryptedPrivateKey?: string): CeloClients {
    if (encryptedPrivateKey) {
      const privateKey = decryptPrivateKey(encryptedPrivateKey);
      return this.clientFactory.getClientsForAccount(privateKey);
    }

    const clients = this.clientFactory.getClients();
    if (!clients.wallet || !clients.accountAddress) {
      throw new Error(
        "No wallet configured. Provide encryptedPrivateKey (encrypt with get_wallet_encryption_public_key) or set CELO_PRIVATE_KEY for local mode.",
      );
    }

    return clients;
  }

  private formatAaveError(error: unknown): never {
    if (error && typeof error === "object" && "name" in error && "message" in error) {
      const named = error as { name: string; message: string };
      throw new Error(`${named.name}: ${named.message}`);
    }

    throw error instanceof Error ? error : new Error(String(error));
  }

  private async assertUsdtBalance(
    publicClient: CeloClients["public"],
    owner: `0x${string}`,
    amount: string,
  ) {
    const usdt = this.tokenService.resolveToken("USDT");
    const required = this.tokenService.parseAmount(amount, usdt.decimals);

    const balance = await publicClient.readContract({
      address: AAVE_USDT,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [owner],
    });

    if (balance < required) {
      throw new Error(
        `Insufficient USDT balance. Required ${amount} USDT, available ${balance.toString()} raw units.`,
      );
    }
  }

  private async assertSuppliedBalance(
    publicClient: CeloClients["public"],
    owner: `0x${string}`,
    amount: string,
  ) {
    const usdt = this.tokenService.resolveToken("USDT");
    const required = this.tokenService.parseAmount(amount, usdt.decimals);

    const balance = await publicClient.readContract({
      address: AAVE_USDT_A_TOKEN,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [owner],
    });

    if (balance < required) {
      throw new Error(
        `Insufficient Aave USDT supply balance. Required ${amount} USDT, available ${balance.toString()} raw aToken units.`,
      );
    }
  }

  async supplyUsdt(amount: string, encryptedPrivateKey?: string) {
    const { public: publicClient, wallet, accountAddress: from } =
      this.resolveClients(encryptedPrivateKey);

    if (!wallet || !from) {
      throw new Error(
        "Wallet client unavailable. Provide encryptedPrivateKey or set CELO_PRIVATE_KEY.",
      );
    }

    await this.assertUsdtBalance(publicClient, from, amount);

    const planResult = await supply(aaveClient, {
      market: evmAddress(AAVE_POOL),
      amount: {
        erc20: {
          currency: evmAddress(AAVE_USDT),
          value: bigDecimal(amount),
        },
      },
      sender: evmAddress(from),
      chainId: chainId(AAVE_CHAIN_ID),
    });

    if (planResult.isErr()) {
      this.formatAaveError(planResult.error);
    }

    const { result, approvalHash } = await sendExecutionPlan(
      wallet,
      publicClient,
      planResult.value,
    );

    const waitResult = await aaveClient.waitForTransaction(result);
    if (waitResult.isErr()) {
      this.formatAaveError(waitResult.error);
    }

    return {
      from,
      amount,
      token: "USDT",
      market: AAVE_POOL,
      hash: waitResult.value,
      approvalHash,
      operation: "SUPPLY",
    };
  }

  async withdrawUsdt(
    amount: string | undefined,
    encryptedPrivateKey?: string,
    withdrawMax?: boolean,
  ) {
    const { public: publicClient, wallet, accountAddress: from } =
      this.resolveClients(encryptedPrivateKey);

    if (!wallet || !from) {
      throw new Error(
        "Wallet client unavailable. Provide encryptedPrivateKey or set CELO_PRIVATE_KEY.",
      );
    }

    if (!withdrawMax && !amount) {
      throw new Error("Provide amount or set withdrawMax to true.");
    }

    if (!withdrawMax && amount) {
      await this.assertSuppliedBalance(publicClient, from, amount);
    }

    const withdrawAmount = withdrawMax
      ? {
          erc20: {
            currency: evmAddress(AAVE_USDT),
            value: { max: true as const },
          },
        }
      : {
          erc20: {
            currency: evmAddress(AAVE_USDT),
            value: { exact: bigDecimal(amount!) },
          },
        };

    const planResult = await withdraw(aaveClient, {
      market: evmAddress(AAVE_POOL),
      amount: withdrawAmount,
      sender: evmAddress(from),
      chainId: chainId(AAVE_CHAIN_ID),
    });

    if (planResult.isErr()) {
      this.formatAaveError(planResult.error);
    }

    const { result } = await sendExecutionPlan(wallet, publicClient, planResult.value);

    const waitResult = await aaveClient.waitForTransaction(result);
    if (waitResult.isErr()) {
      this.formatAaveError(waitResult.error);
    }

    return {
      from,
      amount: withdrawMax ? "max" : amount!,
      token: "USDT",
      market: AAVE_POOL,
      hash: waitResult.value,
      operation: "WITHDRAW",
      withdrawMax: Boolean(withdrawMax),
    };
  }
}
