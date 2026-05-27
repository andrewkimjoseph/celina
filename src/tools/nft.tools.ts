import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppContext } from "../context/app-context.js";
import { addressSchema, tokenIdSchema } from "../schemas/common.js";
import type { ToolModule } from "./types.js";
import { err, ok } from "./helpers.js";

export const nftTools: ToolModule = {
  register(server: McpServer, ctx: AppContext) {
    server.registerTool(
      "get_nft_info",
      {
        title: "Get NFT Info",
        description:
          "Returns NFT token information including metadata for ERC-721 or ERC-1155 on mainnet.",
        inputSchema: z.object({
          contractAddress: addressSchema,
          tokenId: tokenIdSchema,
        }),
        annotations: { readOnlyHint: true, idempotentHint: true },
      },
      async ({ contractAddress, tokenId }) => {
        try {
          return ok(
            await ctx.nft.getNftInfo(
              contractAddress as `0x${string}`,
              tokenId,
            ),
          );
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );

    server.registerTool(
      "get_nft_balance",
      {
        title: "Get NFT Balance",
        description:
          "Returns NFT balance for an address. Token ID required for ERC-1155.",
        inputSchema: z.object({
          contractAddress: addressSchema,
          address: addressSchema,
          tokenId: tokenIdSchema.optional(),
        }),
        annotations: { readOnlyHint: true, idempotentHint: true },
      },
      async ({ contractAddress, address, tokenId }) => {
        try {
          return ok(
            await ctx.nft.getNftBalance(
              contractAddress as `0x${string}`,
              address as `0x${string}`,
              tokenId,
            ),
          );
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );
  },
};
