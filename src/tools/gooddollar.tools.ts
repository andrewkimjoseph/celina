import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppContext } from "../context/app-context.js";
import type { ToolModule } from "./types.js";
import { addressSchema } from "../schemas/common.js";
import { err, ok } from "./helpers.js";

export const gooddollarTools: ToolModule = {
  register(server: McpServer, ctx: AppContext) {
    server.registerTool(
      "get_gooddollar_whitelisting_info",
      {
        title: "Get GoodDollar Whitelisting Info",
        description:
          "Returns GoodDollar IdentityV4 whitelisting status for a wallet, including when it was whitelisted, last authentication date, and reverification progress.",
        inputSchema: z.object({
          address: addressSchema,
        }),
        annotations: { readOnlyHint: true, idempotentHint: true },
      },
      async ({ address }) => {
        try {
          return ok(
            await ctx.gooddollar.getWhitelistingInfo(address as `0x${string}`),
          );
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );
  },
};
