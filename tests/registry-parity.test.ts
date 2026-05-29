import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MCP_TOOL_NAMES } from "@andrewkimjoseph/celina-sdk/testing";
import { getMcpClient } from "./helpers/run-mcp-operation.js";

const TOOLS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/tools",
);

function collectRegisteredToolNames(): string[] {
  const names = new Set<string>();
  const files = readdirSync(TOOLS_DIR).filter(
    (file) => file.endsWith(".tools.ts") && file !== "index.ts",
  );

  const pattern = /registerTool\(\s*["'`]([^"'`]+)["'`]/g;

  for (const file of files) {
    const source = readFileSync(path.join(TOOLS_DIR, file), "utf8");
    for (const match of source.matchAll(pattern)) {
      names.add(match[1]);
    }
  }

  return [...names].sort();
}

describe("registry parity", () => {
  it("every registerTool name appears in the operation catalog", () => {
    const registered = collectRegisteredToolNames();
    const catalog = [...MCP_TOOL_NAMES].sort();

    for (const tool of registered) {
      expect(catalog, `Missing catalog entry for MCP tool "${tool}"`).toContain(
        tool,
      );
    }
  });

  it("every catalog MCP tool is registered in source", () => {
    const registered = collectRegisteredToolNames();

    for (const tool of MCP_TOOL_NAMES) {
      expect(
        registered,
        `Catalog references unknown MCP tool "${tool}"`,
      ).toContain(tool);
    }
  });

  it("tools/list matches registered tool names", async () => {
    const client = await getMcpClient();
    const listed = (await client.listTools()).sort();
    const registered = collectRegisteredToolNames();

    expect(listed).toEqual(registered);
  });
});
