import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppContext } from "../context/app-context.js";
import { addressSchema, tokenSymbolSchema } from "../schemas/common.js";
import type { ToolModule } from "./types.js";
import { err, ok } from "./helpers.js";

const encryptedPrivateKeySchema = z
  .string()
  .optional()
  .describe(
    "Optional RSA-OAEP encrypted private key (base64) for self-hosted HTTP mode. Prefer CELO_PRIVATE_KEY in MCP env.",
  );

const mentoFxInputSchema = z.object({
  tokenIn: tokenSymbolSchema.describe("Input token symbol or address"),
  tokenOut: tokenSymbolSchema.describe("Output token symbol or address"),
  amount: z.string().describe("Human-readable amount of tokenIn, e.g. 100"),
});

const mentoFxWalletSchema = mentoFxInputSchema.extend({
  recipient: addressSchema
    .optional()
    .describe("Address that receives output tokens (defaults to signer)"),
  slippageTolerance: z
    .number()
    .min(0)
    .max(20)
    .optional()
    .describe("Max slippage in percent (default 0.5)"),
  deadlineMinutes: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Transaction deadline in minutes (default 5)"),
  encryptedPrivateKey: encryptedPrivateKeySchema,
});

export const mentoFxTools: ToolModule = {
  register(server: McpServer, ctx: AppContext) {
    server.registerTool(
      "get_mento_fx_quote",
      {
        title: "Get Mento FX Quote",
        description:
          "Get an expected Mento FX conversion output for a token pair on mainnet (e.g. USDm → EURm). Oracle-priced via Mento protocol. Read-only; no wallet required.",
        inputSchema: mentoFxInputSchema,
        annotations: { readOnlyHint: true },
      },
      async ({ tokenIn, tokenOut, amount }) => {
        try {
          return ok(await ctx.mentoFx.getFxQuote(tokenIn, tokenOut, amount));
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );

    server.registerTool(
      "estimate_mento_fx",
      {
        title: "Estimate Mento FX",
        description:
          "Estimate gas for a Mento FX conversion on mainnet, including ERC-20 approval if needed. Requires CELO_PRIVATE_KEY in MCP server env.",
        inputSchema: mentoFxWalletSchema,
        annotations: { readOnlyHint: true },
      },
      async ({
        tokenIn,
        tokenOut,
        amount,
        recipient,
        slippageTolerance,
        deadlineMinutes,
        encryptedPrivateKey,
      }) => {
        try {
          return ok(
            await ctx.mentoFx.estimateFx(tokenIn, tokenOut, amount, {
              recipient: recipient as `0x${string}` | undefined,
              slippageTolerance,
              deadlineMinutes,
              encryptedPrivateKey,
            }),
          );
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );

    server.registerTool(
      "execute_mento_fx",
      {
        title: "Execute Mento FX",
        description:
          "Execute a Mento FX conversion on mainnet (e.g. USDm → EURm via Mento oracle pools). Sends approval first if needed, then the FX trade. Requires CELO_PRIVATE_KEY in MCP server env.",
        inputSchema: mentoFxWalletSchema,
        annotations: {
          destructiveHint: true,
          openWorldHint: true,
        },
      },
      async ({
        tokenIn,
        tokenOut,
        amount,
        recipient,
        slippageTolerance,
        deadlineMinutes,
        encryptedPrivateKey,
      }) => {
        try {
          return ok(
            await ctx.mentoFx.executeFx(tokenIn, tokenOut, amount, {
              recipient: recipient as `0x${string}` | undefined,
              slippageTolerance,
              deadlineMinutes,
              encryptedPrivateKey,
            }),
          );
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );
  },
};
