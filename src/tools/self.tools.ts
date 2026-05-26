import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppContext } from "../context/app-context.js";
import { selfDemoUrl } from "../config/self.js";
import type { ToolModule } from "./types.js";
import { addressSchema } from "../schemas/common.js";
import { err, ok } from "./helpers.js";

const SELF_DEMO_VERIFY_URL = selfDemoUrl("/api/demo/verify");

const encryptedSelfAgentPrivateKeySchema = z
  .string()
  .optional()
  .describe(
    "RSA-OAEP encrypted Self agent private key (base64). Encrypt locally with get_wallet_encryption_public_key.",
  );

const selfRegistrationModeSchema = z
  .enum([
    "linked",
    "wallet-free",
    "smartwallet",
    "self-custody",
    "ed25519",
    "ed25519-linked",
  ])
  .optional();

export const selfTools: ToolModule = {
  register(server: McpServer, ctx: AppContext) {
    server.registerTool(
      "verify_self_agent",
      {
        title: "Verify Self Agent",
        description:
          "Verify whether an agent address is backed by a real human on Self Agent ID (Celo mainnet). Checks on-chain registration, proof provider, credentials, and proof expiry.",
        inputSchema: z.object({
          agent_address: addressSchema,
          require_age: z
            .union([z.literal(0), z.literal(18), z.literal(21)])
            .optional()
            .default(0),
          require_ofac: z.boolean().optional().default(false),
          require_self_provider: z.boolean().optional().default(true),
        }),
        annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
      },
      async (args) => {
        try {
          return ok(
            await ctx.self.verifyAgent({
              agentAddress: args.agent_address as `0x${string}`,
              requireAge: args.require_age,
              requireOfac: args.require_ofac,
              requireSelfProvider: args.require_self_provider,
            }),
          );
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );

    server.registerTool(
      "lookup_self_agent",
      {
        title: "Look Up Self Agent",
        description:
          "Look up a Self Agent ID by numeric on-chain ID via ai.self.xyz, enriched with on-chain proof expiry from the registry.",
        inputSchema: z.object({
          agent_id: z.number().int().positive(),
        }),
        annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
      },
      async ({ agent_id }) => {
        try {
          return ok(await ctx.self.lookupAgent(agent_id));
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );

    server.registerTool(
      "verify_self_request",
      {
        title: "Verify Self Agent Request",
        description:
          "Verify incoming HTTP request headers signed by a Self Agent (x-self-agent-signature, x-self-agent-timestamp). Recovers signer from signature and checks on-chain registration.",
        inputSchema: z.object({
          agent_signature: z
            .string()
            .regex(/^0x[a-fA-F0-9]+$/, "Invalid signature hex"),
          agent_timestamp: z.string(),
          method: z.string(),
          path: z.string(),
          body: z.string().optional(),
          keytype: z.string().optional(),
          agent_key: z
            .string()
            .regex(/^0x[a-fA-F0-9]+$/, "Invalid agent key hex")
            .optional(),
        }),
        annotations: { readOnlyHint: true, idempotentHint: true },
      },
      async (args) => {
        try {
          return ok(
            await ctx.self.verifyRequest({
              agentSignature: args.agent_signature as `0x${string}`,
              agentTimestamp: args.agent_timestamp,
              method: args.method,
              path: args.path,
              body: args.body,
              keytype: args.keytype,
              agentKey: args.agent_key as `0x${string}` | undefined,
            }),
          );
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );

    server.registerTool(
      "register_self_agent",
      {
        title: "Register Self Agent",
        description:
          "Start Self Agent ID registration. Returns a QR/deep link for the human to scan with the Self app. Poll with check_self_registration.",
        inputSchema: z.object({
          mode: selfRegistrationModeSchema.describe(
            "Registration mode (default wallet-free)",
          ),
          minimum_age: z
            .union([z.literal(0), z.literal(18), z.literal(21)])
            .optional(),
          ofac: z.boolean().optional(),
          human_address: addressSchema.optional(),
          agent_name: z.string().optional(),
          agent_description: z.string().optional(),
        }),
        annotations: {
          destructiveHint: true,
          openWorldHint: true,
        },
      },
      async (args) => {
        try {
          return ok(
            await ctx.self.registerAgent({
              mode: args.mode,
              minimumAge: args.minimum_age,
              ofac: args.ofac,
              humanAddress: args.human_address as `0x${string}` | undefined,
              agentName: args.agent_name,
              agentDescription: args.agent_description,
            }),
          );
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );

    server.registerTool(
      "check_self_registration",
      {
        title: "Check Self Registration",
        description:
          "Poll a pending Self registration, proof refresh, or deregistration session. Returns private_key_hex when registration completes.",
        inputSchema: z.object({
          session_id: z.string(),
        }),
        annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
      },
      async ({ session_id }) => {
        try {
          return ok(await ctx.self.checkRegistration(session_id));
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );

    server.registerTool(
      "get_self_identity",
      {
        title: "Get Self Agent Identity",
        description:
          "Return the configured Self agent's on-chain identity, credentials summary, and proof expiry. Requires SELF_AGENT_PRIVATE_KEY or encryptedSelfAgentPrivateKey.",
        inputSchema: z.object({
          encryptedSelfAgentPrivateKey: encryptedSelfAgentPrivateKeySchema,
        }),
        annotations: { readOnlyHint: true, idempotentHint: true },
      },
      async ({ encryptedSelfAgentPrivateKey }) => {
        try {
          return ok(
            await ctx.self.getIdentity({ encryptedSelfAgentPrivateKey }),
          );
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );

    server.registerTool(
      "refresh_self_proof",
      {
        title: "Refresh Self Proof",
        description:
          "Start a human proof refresh after on-chain proof expiry (isProofFresh is false). Returns an error while the proof is still fresh. Poll completion with check_self_registration. Self SDK also supports deregister_self_agent then register_self_agent.",
        inputSchema: z.object({
          agent_id: z.number().int().positive().optional(),
          encryptedSelfAgentPrivateKey: encryptedSelfAgentPrivateKeySchema,
        }),
        annotations: { openWorldHint: true },
      },
      async ({ agent_id, encryptedSelfAgentPrivateKey }) => {
        try {
          return ok(
            await ctx.self.refreshProof({
              agentId: agent_id,
              encryptedSelfAgentPrivateKey,
            }),
          );
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );

    server.registerTool(
      "deregister_self_agent",
      {
        title: "Deregister Self Agent",
        description:
          "Start irreversible Self agent deregistration. Human must confirm via Self app QR. Poll with check_self_registration.",
        inputSchema: z.object({
          encryptedSelfAgentPrivateKey: encryptedSelfAgentPrivateKeySchema,
        }),
        annotations: {
          destructiveHint: true,
          openWorldHint: true,
        },
      },
      async ({ encryptedSelfAgentPrivateKey }) => {
        try {
          return ok(
            await ctx.self.deregisterAgent({ encryptedSelfAgentPrivateKey }),
          );
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );

    server.registerTool(
      "sign_self_request",
      {
        title: "Sign Self Agent Request",
        description:
          `Sign an HTTP request with the configured Self agent identity. Returns x-self-agent-* headers for gated APIs. For Self demo endpoints on Celo mainnet, use ?network=celo-mainnet (e.g. POST ${SELF_DEMO_VERIFY_URL}).`,
        inputSchema: z.object({
          method: z.enum(["GET", "POST", "PUT", "DELETE"]),
          url: z
            .string()
            .url()
            .refine((u) => u.startsWith("http://") || u.startsWith("https://"), {
              message: "Only http:// and https:// URLs are allowed",
            }),
          body: z.string().optional(),
          encryptedSelfAgentPrivateKey: encryptedSelfAgentPrivateKeySchema,
        }),
        annotations: { readOnlyHint: true, idempotentHint: true },
      },
      async ({ method, url, body, encryptedSelfAgentPrivateKey }) => {
        try {
          return ok(
            await ctx.self.signRequest({
              method,
              url,
              body,
              encryptedSelfAgentPrivateKey,
            }),
          );
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );

    server.registerTool(
      "authenticated_self_fetch",
      {
        title: "Authenticated Self Fetch",
        description:
          `Make an HTTP request with Self Agent ID authentication headers applied automatically. For Self demo endpoints on Celo mainnet, use ?network=celo-mainnet (e.g. POST ${SELF_DEMO_VERIFY_URL}).`,
        inputSchema: z.object({
          method: z.enum(["GET", "POST", "PUT", "DELETE"]),
          url: z
            .string()
            .url()
            .refine((u) => u.startsWith("http://") || u.startsWith("https://"), {
              message: "Only http:// and https:// URLs are allowed",
            }),
          body: z.string().optional(),
          content_type: z.string().optional().default("application/json"),
          encryptedSelfAgentPrivateKey: encryptedSelfAgentPrivateKeySchema,
        }),
        annotations: { openWorldHint: true },
      },
      async ({ method, url, body, content_type, encryptedSelfAgentPrivateKey }) => {
        try {
          return ok(
            await ctx.self.authenticatedFetch({
              method,
              url,
              body,
              contentType: content_type,
              encryptedSelfAgentPrivateKey,
            }),
          );
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );
  },
};
