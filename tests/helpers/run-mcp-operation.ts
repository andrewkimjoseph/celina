import { createCelinaClient } from "@andrewkimjoseph/celina-sdk";
import type {
  MainnetFixtures,
  OperationSpec,
} from "@andrewkimjoseph/celina-sdk/testing";
import {
  getMainnetFixtures,
  getOperationSkipReason,
  loadTestConfig,
} from "@andrewkimjoseph/celina-sdk/testing";
import {
  McpStdioClient,
  parseToolResultBody,
} from "./mcp-stdio-client.js";

export interface RunMcpOperationResult {
  status: "passed" | "skipped" | "failed";
  reason?: string;
  error?: unknown;
}

let fixturesPromise: Promise<MainnetFixtures> | undefined;
let mcpClient: McpStdioClient | undefined;

async function getFixtures(): Promise<MainnetFixtures> {
  if (!fixturesPromise) {
    const client = createCelinaClient(loadTestConfig());
    fixturesPromise = getMainnetFixtures(client);
  }
  return fixturesPromise;
}

export async function getMcpClient(): Promise<McpStdioClient> {
  if (!mcpClient) {
    mcpClient = new McpStdioClient(McpStdioClient.defaultServerPath());
    await mcpClient.initialize();
  }
  return mcpClient;
}

/** Build signed Self request args for verify_self_request when key is configured. */
export async function enrichFixturesForMcp(
  fixtures: MainnetFixtures,
): Promise<MainnetFixtures> {
  if (process.env.CELINA_TEST_SELF_VERIFY !== "1") {
    return fixtures;
  }

  if (!process.env.SELF_AGENT_PRIVATE_KEY) {
    return fixtures;
  }

  const client = await getMcpClient();
  const signed = await client.callTool("sign_self_request", {
    method: "GET",
    url: "https://app.ai.self.xyz/api/demo/verify?network=celo-mainnet",
  });

  if (signed.isError) {
    return fixtures;
  }

  const body = parseToolResultBody(signed) as {
    headers?: Record<string, string>;
    method?: string;
    path?: string;
  };

  const headers = body.headers ?? {};
  fixtures.selfVerifyRequestArgs = {
    agent_signature: headers["x-self-agent-signature"],
    agent_timestamp: headers["x-self-agent-timestamp"],
    method: body.method ?? "GET",
    path: body.path ?? "/api/demo/verify?network=celo-mainnet",
    keytype: headers["x-self-agent-keytype"],
    agent_key: headers["x-self-agent-key"],
  };

  return fixtures;
}

export async function runMcpOperation(
  spec: OperationSpec,
): Promise<RunMcpOperationResult> {
  if (!spec.mcp) {
    return { status: "skipped", reason: "MCP tool not defined for operation" };
  }

  const skipReason = getOperationSkipReason(spec);
  if (skipReason) {
    return { status: "skipped", reason: skipReason };
  }

  let fixtures = await getFixtures();
  fixtures = await enrichFixturesForMcp(fixtures);

  const dynamicSkip = spec.skip?.();
  if (dynamicSkip) {
    return { status: "skipped", reason: dynamicSkip };
  }

  const client = await getMcpClient();

  try {
    const response = await client.callTool(
      spec.mcp.tool,
      spec.mcp.arguments(fixtures),
    );

    if (response.isError) {
      const message =
        response.content?.[0]?.text ?? `MCP tool ${spec.mcp.tool} failed`;
      throw new Error(message);
    }

    const body = parseToolResultBody(response);
    spec.assert(body, fixtures);
    return { status: "passed" };
  } catch (error) {
    return { status: "failed", error };
  }
}

export async function closeMcpClient(): Promise<void> {
  mcpClient?.close();
  mcpClient = undefined;
  fixturesPromise = undefined;
}
