import {
  ChainId,
  deadlineFromMinutes,
  Mento,
  RouteNotFoundError,
  FXMarketClosedError,
  type CallParams,
} from "../clients/mento-sdk.js";
import { formatUnits } from "viem";
import type { CeloClientFactory, CeloClients } from "../clients/celo-client.js";
import { toMentoTokenAddress } from "../config/chains.js";
import { decryptPrivateKey } from "../crypto/wallet-key-crypto.js";
import { appendCelinaCalldataTag } from "../utils/celina-calldata.js";
import { TokenService, type ResolvedToken } from "./token.service.js";

export interface MentoFxParams {
  slippageTolerance?: number;
  deadlineMinutes?: number;
  recipient?: `0x${string}`;
  encryptedPrivateKey?: string;
}

const DEFAULT_SLIPPAGE = 0.5;
const DEFAULT_DEADLINE_MINUTES = 5;

export class MentoFxService {
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

  private async getMentoClient(publicClient: CeloClients["public"]) {
    return Mento.create(ChainId.CELO, publicClient);
  }

  private resolveMentoPair(tokenIn: string, tokenOut: string) {
    const resolvedIn = this.tokenService.resolveToken(tokenIn);
    const resolvedOut = this.tokenService.resolveToken(tokenOut);

    return {
      resolvedIn,
      resolvedOut,
      mentoIn: toMentoTokenAddress(resolvedIn.address),
      mentoOut: toMentoTokenAddress(resolvedOut.address),
    };
  }

  private fxOptions(params?: MentoFxParams) {
    const slippageTolerance = params?.slippageTolerance ?? DEFAULT_SLIPPAGE;
    const deadlineMinutes = params?.deadlineMinutes ?? DEFAULT_DEADLINE_MINUTES;

    return {
      slippageTolerance,
      deadlineMinutes,
      deadline: deadlineFromMinutes(deadlineMinutes),
    };
  }

  private formatFxError(
    error: unknown,
    tokenIn: string,
    tokenOut: string,
  ): never {
    if (error instanceof RouteNotFoundError) {
      throw new Error(`No Mento FX route for ${tokenIn} → ${tokenOut}.`);
    }

    if (error instanceof FXMarketClosedError) {
      throw new Error(
        "Mento FX market is currently closed. FX quotes and execution are unavailable until the market reopens.",
      );
    }

    if (error instanceof Error && /FXMarketClosed/i.test(error.message)) {
      throw new Error(
        "Mento FX market is currently closed. FX quotes and execution are unavailable until the market reopens.",
      );
    }

    throw error instanceof Error ? error : new Error(String(error));
  }

  private toGasParams(params: CallParams) {
    return {
      to: params.to as `0x${string}`,
      data: appendCelinaCalldataTag(params.data as `0x${string}`),
      value: BigInt(params.value),
    };
  }

  private async estimateCallGas(
    client: CeloClients["public"],
    from: `0x${string}`,
    params: CallParams,
  ) {
    const gas = await client.estimateGas({
      account: from,
      ...this.toGasParams(params),
    });
    return gas.toString();
  }

  private baseQuoteFields(
    resolvedIn: ResolvedToken,
    resolvedOut: ResolvedToken,
    amount: string,
    expectedOutWei: bigint,
    routeHops: number,
  ) {
    return {
      protocol: "mento_fx" as const,
      network: "mainnet" as const,
      tokenIn: resolvedIn.symbol,
      tokenOut: resolvedOut.symbol,
      amountIn: amount,
      expectedOut: formatUnits(expectedOutWei, resolvedOut.decimals),
      routeHops,
    };
  }

  async getFxQuote(tokenIn: string, tokenOut: string, amount: string) {
    const { public: client } = this.clientFactory.getClients();
    const { resolvedIn, resolvedOut, mentoIn, mentoOut } =
      this.resolveMentoPair(tokenIn, tokenOut);

    const amountInWei = this.tokenService.parseAmount(amount, resolvedIn.decimals);

    try {
      const mento = await this.getMentoClient(client);
      const [expectedOutWei, route] = await Promise.all([
        mento.quotes.getAmountOut(mentoIn, mentoOut, amountInWei),
        mento.routes.findRoute(mentoIn, mentoOut),
      ]);

      return this.baseQuoteFields(
        resolvedIn,
        resolvedOut,
        amount,
        expectedOutWei,
        route.path.length,
      );
    } catch (error) {
      this.formatFxError(error, resolvedIn.symbol, resolvedOut.symbol);
    }
  }

  async estimateFx(
    tokenIn: string,
    tokenOut: string,
    amount: string,
    params?: MentoFxParams,
  ) {
    const { public: client, accountAddress: from } = this.resolveClients(
      params?.encryptedPrivateKey,
    );

    if (!from) {
      throw new Error("Wallet address unavailable.");
    }

    const { resolvedIn, resolvedOut, mentoIn, mentoOut } =
      this.resolveMentoPair(tokenIn, tokenOut);
    const recipient = params?.recipient ?? from;
    const amountInWei = this.tokenService.parseAmount(amount, resolvedIn.decimals);
    const { slippageTolerance, deadlineMinutes, deadline } =
      this.fxOptions(params);

    try {
      const mento = await this.getMentoClient(client);
      const { approval, swap } = await mento.swap.buildSwapTransaction(
        mentoIn,
        mentoOut,
        amountInWei,
        recipient,
        from,
        { slippageTolerance, deadline },
      );

      const [approvalGas, fxGas] = await Promise.all([
        approval
          ? this.estimateCallGas(client, from, approval)
          : Promise.resolve(undefined),
        this.estimateCallGas(client, from, swap.params),
      ]);

      return {
        ...this.baseQuoteFields(
          resolvedIn,
          resolvedOut,
          amount,
          swap.expectedAmountOut,
          swap.route.path.length,
        ),
        from,
        recipient,
        amountOutMin: formatUnits(swap.amountOutMin, resolvedOut.decimals),
        approvalNeeded: approval !== null,
        approvalGas,
        fxGas,
        slippageTolerance,
        deadline: deadline.toString(),
        deadlineMinutes,
      };
    } catch (error) {
      this.formatFxError(error, resolvedIn.symbol, resolvedOut.symbol);
    }
  }

  async executeFx(
    tokenIn: string,
    tokenOut: string,
    amount: string,
    params?: MentoFxParams,
  ) {
    const { public: client, wallet, accountAddress: from } = this.resolveClients(
      params?.encryptedPrivateKey,
    );

    if (!wallet || !from) {
      throw new Error(
        "Wallet client unavailable. Provide encryptedPrivateKey or set CELO_PRIVATE_KEY.",
      );
    }

    const account = wallet.account;
    if (!account) {
      throw new Error("Wallet account unavailable.");
    }

    const chain = client.chain;
    if (!chain) {
      throw new Error("Chain configuration missing");
    }

    const { resolvedIn, resolvedOut, mentoIn, mentoOut } =
      this.resolveMentoPair(tokenIn, tokenOut);
    const recipient = params?.recipient ?? from;
    const amountInWei = this.tokenService.parseAmount(amount, resolvedIn.decimals);
    const { slippageTolerance, deadlineMinutes, deadline } =
      this.fxOptions(params);

    try {
      const mento = await this.getMentoClient(client);
      const { approval, swap } = await mento.swap.buildSwapTransaction(
        mentoIn,
        mentoOut,
        amountInWei,
        recipient,
        from,
        { slippageTolerance, deadline },
      );

      let approvalHash: `0x${string}` | undefined;

      if (approval) {
        approvalHash = await wallet.sendTransaction({
          chain,
          account,
          ...this.toGasParams(approval),
        });
        await client.waitForTransactionReceipt({ hash: approvalHash });
      }

      const hash = await wallet.sendTransaction({
        chain,
        account,
        ...this.toGasParams(swap.params),
      });

      const receipt = await client.waitForTransactionReceipt({ hash });

      return {
        ...this.baseQuoteFields(
          resolvedIn,
          resolvedOut,
          amount,
          swap.expectedAmountOut,
          swap.route.path.length,
        ),
        from,
        recipient,
        amountOutMin: formatUnits(swap.amountOutMin, resolvedOut.decimals),
        approvalNeeded: approval !== null,
        approvalHash,
        hash,
        status: receipt.status,
        slippageTolerance,
        deadline: deadline.toString(),
        deadlineMinutes,
      };
    } catch (error) {
      this.formatFxError(error, resolvedIn.symbol, resolvedOut.symbol);
    }
  }
}
