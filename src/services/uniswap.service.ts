import type { createCelinaClient } from "@andrewkimjoseph/celina-sdk";
import type { UniswapSwapParams } from "@andrewkimjoseph/celina-sdk";
import type { CeloClientFactory } from "../clients/celo-client.js";
import { executePreparedFlow, requireWalletClients } from "./execute-prepared-flow.js";

type CelinaClient = ReturnType<typeof createCelinaClient>;

export class UniswapService {
  constructor(
    private readonly clientFactory: CeloClientFactory,
    private readonly sdk: CelinaClient,
  ) {}

  getSwapQuote(
    tokenIn: string,
    tokenOut: string,
    amount: string,
  ): ReturnType<CelinaClient["uniswap"]["getSwapQuote"]> {
    return this.sdk.uniswap.getSwapQuote(tokenIn, tokenOut, amount);
  }

  estimateSwap(
    tokenIn: string,
    tokenOut: string,
    amount: string,
    params?: UniswapSwapParams,
  ): ReturnType<CelinaClient["uniswap"]["estimateSwap"]> {
    const { accountAddress: from } = requireWalletClients(
      this.clientFactory.getClients(),
    );
    return this.sdk.uniswap.estimateSwap(from, tokenIn, tokenOut, amount, params);
  }

  async executeSwap(
    tokenIn: string,
    tokenOut: string,
    amount: string,
    params?: UniswapSwapParams,
  ): Promise<{
    from: `0x${string}`;
    recipient: `0x${string}`;
    stepHashes: `0x${string}`[];
    hash: `0x${string}`;
    status: "success" | "reverted";
    slippageTolerance: number;
    deadlineMinutes: number;
    protocol: "uniswap_v4";
    network: "mainnet";
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    expectedOut: string;
    routeHops: number;
    indexSource?: string;
    route: { pools: unknown[] };
  }> {
    const clients = requireWalletClients(this.clientFactory.getClients());
    const { accountAddress: from } = clients;

    const prepared = await this.sdk.uniswap.prepareSwap(
      from,
      tokenIn,
      tokenOut,
      amount,
      params,
    );

    const { stepHashes, hash, status } = await executePreparedFlow(
      clients,
      prepared.steps,
    );
    const quote = await this.sdk.uniswap.getSwapQuote(tokenIn, tokenOut, amount);

    return {
      ...quote,
      from,
      recipient: params?.recipient ?? from,
      stepHashes,
      hash,
      status,
      slippageTolerance: params?.slippageTolerance ?? 0.5,
      deadlineMinutes: params?.deadlineMinutes ?? 5,
    };
  }
}
