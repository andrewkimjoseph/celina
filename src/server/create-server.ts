import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadConfig } from "../config/env.js";
import { CeloClientFactory } from "../clients/celo-client.js";
import { createAppContext } from "../context/app-context.js";
import { registerAllTools } from "../tools/index.js";
import { SERVER_INSTRUCTIONS } from "./instructions.js";

export function createServer(): McpServer {
  const config = loadConfig();
  const clientFactory = new CeloClientFactory(config);
  const clients = clientFactory.getClients(config.defaultNetwork);

  const server = new McpServer(
    { name: "celo-mcp", version: "0.1.0" },
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
      config.defaultNetwork,
      clients.accountAddress,
    ),
  );

  return server;
}
