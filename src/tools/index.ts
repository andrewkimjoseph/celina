import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AppContext } from "../context/app-context.js";
import type { ToolModule } from "./types.js";
import { accountTools, blockchainTools } from "./blockchain.tools.js";
import { gooddollarTools } from "./gooddollar.tools.js";
import { tokenTools } from "./token.tools.js";
import { transactionTools } from "./transaction.tools.js";
import { walletTools } from "./wallet.tools.js";

export const toolModules: ToolModule[] = [
  blockchainTools,
  accountTools,
  tokenTools,
  walletTools,
  transactionTools,
  gooddollarTools,
];

export function registerAllTools(server: McpServer, ctx: AppContext): void {
  for (const module of toolModules) {
    module.register(server, ctx);
  }
}
