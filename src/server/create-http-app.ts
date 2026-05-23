import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import type { Request, Response } from "express";
import {
  getEncryptionInfo,
  isWalletEncryptionConfigured,
} from "../crypto/wallet-key-crypto.js";
import { createServer } from "./create-server.js";

const RENDER_EXTERNAL_HOSTNAME = process.env.RENDER_EXTERNAL_HOSTNAME;

export const app = createMcpExpressApp({
  host: "0.0.0.0",
  allowedHosts: RENDER_EXTERNAL_HOSTNAME
    ? [RENDER_EXTERNAL_HOSTNAME]
    : undefined,
});

const transports = new Map<string, StreamableHTTPServerTransport>();

function isInitializeRequest(body: unknown): boolean {
  if (Array.isArray(body)) {
    return body.some(isInitializeRequest);
  }
  if (!body || typeof body !== "object") {
    return false;
  }
  return (body as { method?: string }).method === "initialize";
}

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.get("/public-key", (_req: Request, res: Response) => {
  if (!isWalletEncryptionConfigured()) {
    res.status(503).json({
      error: "Wallet encryption is not configured on this server.",
    });
    return;
  }

  const { publicKey, algorithm, hash, encoding } = getEncryptionInfo();
  res.json({ publicKey, algorithm, hash, encoding });
});

app.post("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  try {
    let transport: StreamableHTTPServerTransport | undefined;

    if (sessionId && transports.has(sessionId)) {
      transport = transports.get(sessionId);
    } else if (!sessionId && isInitializeRequest(req.body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          if (transport) {
            transports.set(id, transport);
          }
        },
      });

      transport.onclose = () => {
        const id = transport?.sessionId;
        if (id) {
          transports.delete(id);
        }
      };

      const server = createServer();
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    } else if (sessionId) {
      res.status(404).json({
        jsonrpc: "2.0",
        error: { code: -32001, message: "Session not found" },
        id: null,
      });
      return;
    } else {
      res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Bad Request: Session ID required" },
        id: null,
      });
      return;
    }

    await transport!.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

app.get("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId) {
    res.status(400).send("Missing session ID");
    return;
  }

  const transport = transports.get(sessionId);
  if (!transport) {
    res.status(404).send("Session not found");
    return;
  }

  try {
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error("Error handling MCP SSE request:", error);
    if (!res.headersSent) {
      res.status(500).send("Error processing SSE stream");
    }
  }
});

app.delete("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId) {
    res.status(400).send("Missing session ID");
    return;
  }

  const transport = transports.get(sessionId);
  if (!transport) {
    res.status(404).send("Session not found");
    return;
  }

  try {
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error("Error handling MCP session termination:", error);
    if (!res.headersSent) {
      res.status(500).send("Error processing session termination");
    }
  }
});
