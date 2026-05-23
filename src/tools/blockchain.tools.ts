import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppContext } from "../context/app-context.js";
import type { ToolModule } from "./types.js";
import {
  addressSchema,
  blockIdSchema,
  networkSchema,
  resolveNetwork,
} from "../schemas/common.js";
import { err, ok } from "./helpers.js";

export const blockchainTools: ToolModule = {
  register(server: McpServer, ctx: AppContext) {
    server.registerTool(
      "get_network_status",
      {
        title: "Get Network Status",
        description: "Returns Celo chain ID, latest block, and gas price.",
        inputSchema: z.object({ network: networkSchema.optional() }),
        annotations: {
          readOnlyHint: true,
          idempotentHint: true,
        },
      },
      async ({ network }) => {
        try {
          const resolved = resolveNetwork(network, ctx.config.defaultNetwork);
          return ok(await ctx.blockchain.getNetworkStatus(resolved));
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );

    server.registerTool(
      "get_block",
      {
        title: "Get Block",
        description: "Fetch a Celo block by number, hash, or latest.",
        inputSchema: z.object({
          blockId: blockIdSchema,
          network: networkSchema.optional(),
        }),
        annotations: { readOnlyHint: true, idempotentHint: true },
      },
      async ({ blockId, network }) => {
        try {
          const resolved = resolveNetwork(network, ctx.config.defaultNetwork);
          return ok(await ctx.blockchain.getBlock(resolved, blockId));
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );

    server.registerTool(
      "get_latest_blocks",
      {
        title: "Get Latest Blocks",
        description: "Fetch the most recent blocks on Celo.",
        inputSchema: z.object({
          count: z.number().int().min(1).max(20).default(5),
          network: networkSchema.optional(),
        }),
        annotations: { readOnlyHint: true, idempotentHint: true },
      },
      async ({ count, network }) => {
        try {
          const resolved = resolveNetwork(network, ctx.config.defaultNetwork);
          return ok(await ctx.blockchain.getLatestBlocks(resolved, count));
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );

    server.registerTool(
      "get_transaction",
      {
        title: "Get Transaction",
        description: "Fetch a transaction and receipt by hash.",
        inputSchema: z.object({
          hash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
          network: networkSchema.optional(),
        }),
        annotations: { readOnlyHint: true, idempotentHint: true },
      },
      async ({ hash, network }) => {
        try {
          const resolved = resolveNetwork(network, ctx.config.defaultNetwork);
          return ok(
            await ctx.blockchain.getTransaction(resolved, hash as `0x${string}`),
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
        description: "Returns native CELO balance, nonce, and contract flag.",
        inputSchema: z.object({
          address: addressSchema,
          network: networkSchema.optional(),
        }),
        annotations: { readOnlyHint: true, idempotentHint: true },
      },
      async ({ address, network }) => {
        try {
          const resolved = resolveNetwork(network, ctx.config.defaultNetwork);
          return ok(
            await ctx.account.getAccount(
              resolved,
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
