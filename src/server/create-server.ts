import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadConfig } from "../config/env.js";
import { CeloClientFactory } from "../clients/celo-client.js";
import { EnsClientFactory } from "../clients/ens-client.js";
import { createAppContext } from "../context/app-context.js";
import { registerAllTools } from "../tools/index.js";
import { SERVER_INSTRUCTIONS } from "./instructions.js";

const require = createRequire(import.meta.url);
const { version } = require("../../package.json") as { version: string };

export function createServer(): McpServer {
  const config = loadConfig();
  const clientFactory = new CeloClientFactory(config);
  const ensClientFactory = new EnsClientFactory(config);
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
      ensClientFactory,
      clients.accountAddress,
      config.selfAgentPrivateKey,
    ),
  );

  return server;
}
