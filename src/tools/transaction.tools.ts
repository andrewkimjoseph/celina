import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppContext } from "../context/app-context.js";
import type { ToolModule } from "./types.js";
import { addressSchema, tokenSymbolSchema } from "../schemas/common.js";
import { err, ok } from "./helpers.js";

const encryptedPrivateKeySchema = z
  .string()
  .optional()
  .describe(
    "RSA-OAEP encrypted private key (base64). Encrypt locally with get_wallet_encryption_public_key.",
  );

export const transactionTools: ToolModule = {
  register(server: McpServer, ctx: AppContext) {
    server.registerTool(
      "estimate_send",
      {
        title: "Estimate Send",
        description:
          "Estimates gas for sending CELO or an ERC-20 token on mainnet. Requires encryptedPrivateKey (hosted) or CELO_PRIVATE_KEY (local).",
        inputSchema: z.object({
          to: addressSchema,
          token: tokenSymbolSchema.default("CELO"),
          amount: z.string().describe("Human-readable amount, e.g. 1.5"),
          encryptedPrivateKey: encryptedPrivateKeySchema,
        }),
        annotations: { readOnlyHint: true },
      },
      async ({ to, token, amount, encryptedPrivateKey }) => {
        try {
          return ok(
            await ctx.transaction.estimateSend(
              to as `0x${string}`,
              token,
              amount,
              encryptedPrivateKey,
            ),
          );
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );

    server.registerTool(
      "send_token",
      {
        title: "Send Token",
        description:
          "Send CELO or an ERC-20 token on mainnet. User must encrypt their private key with the server's public key (get_wallet_encryption_public_key) before calling.",
        inputSchema: z.object({
          to: addressSchema,
          token: tokenSymbolSchema.default("CELO"),
          amount: z.string().describe("Human-readable amount, e.g. 0.01"),
          encryptedPrivateKey: encryptedPrivateKeySchema,
        }),
        annotations: {
          destructiveHint: true,
          openWorldHint: true,
        },
      },
      async ({ to, token, amount, encryptedPrivateKey }) => {
        try {
          return ok(
            await ctx.transaction.sendToken(
              to as `0x${string}`,
              token,
              amount,
              encryptedPrivateKey,
            ),
          );
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );

    server.registerTool(
      "get_swap_quote",
      {
        title: "Get Swap Quote",
        description:
          "Preview a token swap on Celo mainnet. Routing integration is stubbed for v0.1.",
        inputSchema: z.object({
          fromToken: tokenSymbolSchema,
          toToken: tokenSymbolSchema,
          amount: z.string(),
        }),
        annotations: { readOnlyHint: true },
      },
      async ({ fromToken, toToken, amount }) => {
        try {
          return ok(
            await ctx.transaction.getSwapQuote(fromToken, toToken, amount),
          );
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );
  },
};
