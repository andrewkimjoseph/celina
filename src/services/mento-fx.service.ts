import type { createCelinaClient, MentoFxParams } from "@andrewkimjoseph/celina-sdk";
import type { CeloClientFactory } from "../clients/celo-client.js";
import { executePreparedFlow, requireWalletClients } from "./execute-prepared-flow.js";

type CelinaClient = ReturnType<typeof createCelinaClient>;

export class MentoFxService {
  constructor(
    private readonly clientFactory: CeloClientFactory,
    private readonly sdk: CelinaClient,
  ) {}

  getFxQuote(
    tokenIn: string,
    tokenOut: string,
    amount: string,
  ): ReturnType<CelinaClient["mentoFx"]["getFxQuote"]> {
    return this.sdk.mentoFx.getFxQuote(tokenIn, tokenOut, amount);
  }

  estimateFx(
    tokenIn: string,
    tokenOut: string,
    amount: string,
    params?: MentoFxParams,
  ): ReturnType<CelinaClient["mentoFx"]["estimateFx"]> {
    const { accountAddress: from } = requireWalletClients(
      this.clientFactory.getClients(),
    );
    return this.sdk.mentoFx.estimateFx(from, tokenIn, tokenOut, amount, params);
  }

  async executeFx(
    tokenIn: string,
    tokenOut: string,
    amount: string,
    params?: MentoFxParams,
  ) {
    const clients = requireWalletClients(this.clientFactory.getClients());
    const { accountAddress: from } = clients;

    const [prepared, estimate] = await Promise.all([
      this.sdk.mentoFx.prepareFx(from, tokenIn, tokenOut, amount, params),
      this.sdk.mentoFx.estimateFx(from, tokenIn, tokenOut, amount, params),
    ]);

    const { stepHashes, hash, status } = await executePreparedFlow(
      clients,
      prepared.steps,
    );

    const approvalHash =
      stepHashes.length > 1 ? stepHashes[0] : undefined;

    return {
      ...estimate,
      approvalHash,
      hash,
      status,
    };
  }
}
