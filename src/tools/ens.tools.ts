import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppContext } from "../context/app-context.js";
import type { ToolModule } from "./types.js";
import { ensNameSchema } from "../schemas/common.js";
import { err, ok } from "./helpers.js";

export const ensTools: ToolModule = {
  register(server: McpServer, ctx: AppContext) {
    server.registerTool(
      "resolve_ens",
      {
        title: "Resolve ENS",
        description:
          "Resolve an ENS name (e.g. celina.eth) to a 0x address via Ethereum mainnet. Defaults to Celo: tries the Celo coin record first, then falls back to the standard Ethereum address.",
        inputSchema: z.object({
          name: ensNameSchema,
          chain: z
            .enum(["celo", "ethereum"])
            .default("celo")
            .describe(
              "Target chain. celo: Celo coin record with Ethereum fallback. ethereum: Ethereum address only.",
            ),
        }),
        annotations: { readOnlyHint: true, idempotentHint: true },
      },
      async ({ name, chain }) => {
        try {
          return ok(await ctx.ens.resolveEns(name, chain));
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );
  },
};
