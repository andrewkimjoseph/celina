import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppContext } from "../context/app-context.js";
import type { ToolModule } from "./types.js";
import { err, ok } from "./helpers.js";

const encryptedPrivateKeySchema = z
  .string()
  .optional()
  .describe(
    "RSA-OAEP encrypted private key (base64). Encrypt locally with get_wallet_encryption_public_key.",
  );

export const aaveTools: ToolModule = {
  register(server: McpServer, ctx: AppContext) {
    server.registerTool(
      "supply_aave_usdt",
      {
        title: "Supply Aave USDT",
        description:
          "Supply (lend) USDT to Aave V3 on Celo mainnet. Deposits USDT and receives aUSDT interest-bearing tokens. Sends ERC-20 approval first if needed. User must encrypt their private key with the server's public key (get_wallet_encryption_public_key) before calling.",
        inputSchema: z.object({
          amount: z.string().describe("Human-readable USDT amount, e.g. 100"),
          encryptedPrivateKey: encryptedPrivateKeySchema,
        }),
        annotations: {
          destructiveHint: true,
          openWorldHint: true,
        },
      },
      async ({ amount, encryptedPrivateKey }) => {
        try {
          return ok(await ctx.aave.supplyUsdt(amount, encryptedPrivateKey));
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );

    server.registerTool(
      "withdraw_aave_usdt",
      {
        title: "Withdraw Aave USDT",
        description:
          "Withdraw USDT from Aave V3 on Celo mainnet by redeeming aUSDT. User must encrypt their private key with the server's public key (get_wallet_encryption_public_key) before calling.",
        inputSchema: z.object({
          amount: z
            .string()
            .optional()
            .describe("Human-readable USDT amount, e.g. 100 (omit when withdrawMax is true)"),
          withdrawMax: z
            .boolean()
            .optional()
            .describe("Withdraw the full supplied USDT balance from Aave"),
          encryptedPrivateKey: encryptedPrivateKeySchema,
        }),
        annotations: {
          destructiveHint: true,
          openWorldHint: true,
        },
      },
      async ({ amount, withdrawMax, encryptedPrivateKey }) => {
        try {
          return ok(
            await ctx.aave.withdrawUsdt(amount, encryptedPrivateKey, withdrawMax),
          );
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );
  },
};
