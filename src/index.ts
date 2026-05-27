#!/usr/bin/env node
/** Celina MCP server entry — stdio transport. Env is loaded before server bootstrap. */
import "./config/load-env.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server/create-server.js";

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  if (process.env.CELINA_DEBUG === "1") {
    console.error("Celina running on stdio");
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
