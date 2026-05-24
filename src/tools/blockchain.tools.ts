import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppContext } from "../context/app-context.js";
import type { ToolModule } from "./types.js";
import { addressSchema, blockIdSchema } from "../schemas/common.js";
import { err, ok } from "./helpers.js";

export const blockchainTools: ToolModule = {
  register(server: McpServer, ctx: AppContext) {
    server.registerTool(
      "get_network_status",
      {
        title: "Get Network Status",
        description: "Returns Celo mainnet chain ID, latest block, and gas price.",
        inputSchema: z.object({}),
        annotations: {
          readOnlyHint: true,
          idempotentHint: true,
        },
      },
      async () => {
        try {
          return ok(await ctx.blockchain.getNetworkStatus());
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );

    server.registerTool(
      "get_block",
      {
        title: "Get Block",
        description: "Fetch a Celo mainnet block by number, hash, or latest.",
        inputSchema: z.object({
          blockId: blockIdSchema,
        }),
        annotations: { readOnlyHint: true, idempotentHint: true },
      },
      async ({ blockId }) => {
        try {
          return ok(await ctx.blockchain.getBlock(blockId));
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );

    server.registerTool(
      "get_latest_blocks",
      {
        title: "Get Latest Blocks",
        description: "Fetch the most recent blocks on Celo mainnet.",
        inputSchema: z.object({
          count: z.number().int().min(1).max(20).default(5),
        }),
        annotations: { readOnlyHint: true, idempotentHint: true },
      },
      async ({ count }) => {
        try {
          return ok(await ctx.blockchain.getLatestBlocks(count));
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );

    server.registerTool(
      "get_transaction",
      {
        title: "Get Transaction",
        description: "Fetch a transaction and receipt by hash on Celo mainnet.",
        inputSchema: z.object({
          hash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
        }),
        annotations: { readOnlyHint: true, idempotentHint: true },
      },
      async ({ hash }) => {
        try {
          return ok(
            await ctx.blockchain.getTransaction(hash as `0x${string}`),
          );
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );
  },
};

export const accountTools: ToolModule = {
  register(server: McpServer, ctx: AppContext) {
    server.registerTool(
      "get_account",
      {
        title: "Get Account",
        description: "Returns native CELO balance, nonce, and contract flag on mainnet.",
        inputSchema: z.object({
          address: addressSchema,
        }),
        annotations: { readOnlyHint: true, idempotentHint: true },
      },
      async ({ address }) => {
        try {
          return ok(
            await ctx.account.getAccount(address as `0x${string}`),
          );
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );
  },
};
