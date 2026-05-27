/** MCP server factory: load config → create clients → register all tool modules. */
import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadConfig } from "../config/env.js";
import { CeloClientFactory } from "../clients/celo-client.js";
import { createAppContext } from "../context/app-context.js";
import { registerAllTools } from "../tools/index.js";
import { SERVER_INSTRUCTIONS } from "./instructions.js";

const require = createRequire(import.meta.url);
const { version } = require("../../package.json") as { version: string };

export function createServer(): McpServer {
  const config = loadConfig();
  const clientFactory = new CeloClientFactory(config);
  const clients = clientFactory.getClients();

  const server = new McpServer(
    { name: "celina-mcp", version },
    {
      instructions: SERVER_INSTRUCTIONS,
      capabilities: {
        tools: { listChanged: true },
        logging: {},
      },
    },
  );

  registerAllTools(
    server,
    createAppContext(
      clientFactory,
      config,
      clients.accountAddress,
      config.selfAgentPrivateKey,
    ),
  );

  return server;
}
