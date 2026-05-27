import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppContext } from "../context/app-context.js";
import type { ToolModule } from "./types.js";
import { addressSchema, tokenSymbolSchema } from "../schemas/common.js";
import { err, ok } from "./helpers.js";

export const tokenTools: ToolModule = {
  register(server: McpServer, ctx: AppContext) {
    server.registerTool(
      "get_celo_balances",
      {
        title: "Get Celo Balances",
        description:
          "Returns native CELO and ERC-20 balances for an address on mainnet. Defaults to CELO + USDm.",
        inputSchema: z.object({
          address: addressSchema,
          tokens: z.array(tokenSymbolSchema).optional(),
        }),
        annotations: { readOnlyHint: true, idempotentHint: true },
      },
      async ({ address, tokens }) => {
        try {
          return ok(
            await ctx.token.getBalances(
              address as `0x${string}`,
              tokens,
            ),
          );
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );

    server.registerTool(
      "get_stablecoin_balances",
      {
        title: "Get Stablecoin Balances",
        description:
          "Returns balances for Celo mainnet local stablecoins (Mento, USDC, USDT, etc.). Checks all stablecoins by default and omits zero balances.",
        inputSchema: z.object({
          address: addressSchema,
          stablecoins: z
            .array(z.string())
            .optional()
            .describe(
              "Stablecoin symbols to check (e.g. USDm, USDC). Defaults to all mainnet stablecoins.",
            ),
          includeZero: z
            .boolean()
            .optional()
            .describe("Include stablecoins with zero balance"),
        }),
        annotations: { readOnlyHint: true, idempotentHint: true },
      },
      async ({ address, stablecoins, includeZero }) => {
        try {
          return ok(
            await ctx.token.getStablecoinBalances(
              address as `0x${string}`,
              { stablecoins, includeZero },
            ),
          );
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );

    server.registerTool(
      "get_token_info",
      {
        title: "Get Token Info",
        description: "Returns metadata for a known or custom ERC-20 token on mainnet.",
        inputSchema: z.object({
          token: tokenSymbolSchema,
        }),
        annotations: { readOnlyHint: true, idempotentHint: true },
      },
      async ({ token }) => {
        try {
          return ok(await ctx.token.getTokenInfo(token));
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );

    server.registerTool(
      "get_token_balance",
      {
        title: "Get Token Balance",
        description:
          "Returns ERC-20 balance for a specific token contract address on mainnet.",
        inputSchema: z.object({
          tokenAddress: addressSchema,
          address: addressSchema,
        }),
        annotations: { readOnlyHint: true, idempotentHint: true },
      },
      async ({ tokenAddress, address }) => {
        try {
          return ok(
            await ctx.token.getTokenBalance(
              tokenAddress as `0x${string}`,
              address as `0x${string}`,
            ),
          );
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );
  },
};
