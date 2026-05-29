import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createCelinaClient } from "@andrewkimjoseph/celina-sdk";
import {
  getMainnetFixtures,
  loadTestConfig,
  MCP_OPERATIONS,
} from "@andrewkimjoseph/celina-sdk/testing";
import {
  closeMcpClient,
  enrichFixturesForMcp,
  getMcpClient,
  runMcpOperation,
} from "./helpers/run-mcp-operation.js";

beforeAll(async () => {
  await getMcpClient();
  if (process.env.CELINA_TEST_SELF_VERIFY === "1") {
    const client = createCelinaClient(loadTestConfig());
    const fixtures = await getMainnetFixtures(client);
    await enrichFixturesForMcp(fixtures);
  }
});

afterAll(async () => {
  await closeMcpClient();
});

describe.each(MCP_OPERATIONS)("$id", (spec) => {
  it("live mainnet via MCP", async () => {
    const outcome = await runMcpOperation(spec);

    if (outcome.status === "skipped") {
      console.log(`[skip] ${spec.id}: ${outcome.reason}`);
      return;
    }

    if (outcome.status === "failed") {
      throw outcome.error;
    }

    expect(outcome.status).toBe("passed");
  });
});
