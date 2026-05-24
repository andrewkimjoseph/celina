# Celina — Celo MCP Server

**Celina** is an open-source [Model Context Protocol](https://modelcontextprotocol.io) server that gives LLMs read + write access to **Celo mainnet** — balances, stablecoins, sends, and chain reads.

Website: [celina.andrewkimjoseph.com](https://celina.andrewkimjoseph.com)

## Install

```bash
npm i @andrewkimjoseph/celina
```

npm: [@andrewkimjoseph/celina](https://www.npmjs.com/package/@andrewkimjoseph/celina)

## Quick start

**From npm** (stdio MCP server):

```bash
npx @andrewkimjoseph/celina
```

**From source** (development):

```bash
npm install
npm run build
npm start
```

## Deploy to Render

This project includes a [Render Blueprint](render.yaml) for one-click deployment as a public Streamable HTTP MCP server.

### 1. Generate an RSA key pair

```bash
openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in private.pem -out public.pem
```

### 2. Deploy

1. Push this repo to GitHub
2. Render Dashboard → **New → Blueprint** → connect the repo
3. Set `WALLET_ENCRYPTION_PRIVATE_KEY` in the Render Environment tab (paste contents of `private.pem`)
4. (Optional) Add a custom domain in Render and set `ALLOWED_HOSTS` to that hostname (comma-separated if multiple)
5. Your MCP endpoint will be at `https://mcp.celina.andrewkimjoseph.com/mcp` (or your Render URL + `/mcp`)

> **Note:** Free Render services spin down after ~15 minutes of inactivity. Cold starts can take 30–60 seconds and may cause MCP client timeouts. Use a Starter plan for always-on hosting.

## Cursor / Claude Desktop config

### Remote (recommended)

```json
{
  "mcpServers": {
    "celina": {
      "type": "streamable-http",
      "url": "https://mcp.celina.andrewkimjoseph.com/mcp"
    }
  }
}
```

> Custom domains must be listed in `ALLOWED_HOSTS` on the server. Render's default hostname (`RENDER_EXTERNAL_HOSTNAME`) is always allowed automatically.

### Local stdio (npm)

```json
{
  "mcpServers": {
    "celina": {
      "command": "npx",
      "args": ["-y", "@andrewkimjoseph/celina"]
    }
  }
}
```

### Local stdio (from source)

```json
{
  "mcpServers": {
    "celina": {
      "command": "node",
      "args": ["/absolute/path/to/celina/build/index.js"]
    }
  }
}
```

For local write tools, add a funded mainnet wallet:

```json
"env": {
  "CELO_PRIVATE_KEY": "0x..."
}
```

Never commit private keys. Use env vars only.

## Local LLM integration

Celina is an **MCP tool server**. A local LLM stack needs an **MCP client** that can connect to Celina and pass tool definitions to a model that supports **function / tool calling**.

Read-only tools (balances, blocks, GoodDollar status, etc.) work out of the box. For local write tools (`send_token`, `estimate_send`, `execute_mento_fx`), set `CELO_PRIVATE_KEY` in the MCP server `env` block (stdio) or use the [hosted encryption flow](#write-tools-hosted-mode) (HTTP).

### LM Studio (0.3.17+)

LM Studio can host MCP servers directly via `mcp.json` (same format as Cursor).

1. Open LM Studio → **Program** → **Install** → **Edit mcp.json**
2. Add Celina under `mcpServers`
3. In **Server Settings**, enable **Allow calling servers from mcp.json**
4. Chat with a tool-capable model (e.g. Qwen 2.5, Llama 3.1+)

```json
{
  "mcpServers": {
    "celina": {
      "command": "npx",
      "args": ["-y", "@andrewkimjoseph/celina"],
      "env": {
        "CELO_PRIVATE_KEY": "0x..."
      }
    }
  }
}
```

Omit `CELO_PRIVATE_KEY` if you only need read-only chain queries.

### Open WebUI + Ollama

[Open WebUI](https://docs.openwebui.com/features/extensibility/mcp/) supports **streamable HTTP** MCP natively (not stdio).

**Hosted Celina (easiest):** Admin Settings → External Tools → **Add Server** → Type: **MCP (Streamable HTTP)** → URL:

```
https://mcp.celina.andrewkimjoseph.com/mcp
```

**Local HTTP server:** run Celina in HTTP mode, then point Open WebUI at it:

```bash
npm run build
npm run start:http
```

Add an External Tool with Type **MCP (Streamable HTTP)** and URL `http://localhost:10000/mcp`.

For write tools over HTTP, set `WALLET_ENCRYPTION_PRIVATE_KEY` in `.env` (see [Deploy to Render](#deploy-to-render)) and use the [encrypt-key flow](#write-tools-hosted-mode).

> If Open WebUI runs in Docker, use `http://host.docker.internal:10000/mcp` instead of `localhost`.

### Continue (VS Code)

[Continue](https://docs.continue.dev/customize/deep-dives/mcp) works with local models (Ollama, LM Studio, etc.) in **agent mode**.

Create `.continue/mcpServers/celina.yaml` in your workspace:

```yaml
name: Celina
version: 0.0.1
schema: v1
mcpServers:
  - name: celina
    type: stdio
    command: npx
    args:
      - "-y"
      - "@andrewkimjoseph/celina"
    env:
      CELO_PRIVATE_KEY: "0x..."
```

Alternatively, copy the [local stdio JSON](#local-stdio-npm) from the Cursor section into `.continue/mcpServers/mcp.json` — Continue picks up Claude/Cursor-style configs automatically.

### Test without an LLM

Use MCP Inspector to call Celina tools directly over stdio:

```bash
npm run build
npm run inspect
```

### Tips

- Use models with reliable tool-calling support; small or older models may skip tools or call them incorrectly.
- Start with read-only prompts, e.g. *"What's the USDm balance of 0x…?"* or *"Is this wallet GoodDollar whitelisted?"*
- Keep private keys in env vars only — never commit them to config files in git.

## Write tools (hosted mode)

Write tools (`send_token`, `estimate_send`, `execute_mento_fx`) accept an RSA-encrypted private key per request — never plaintext.

### Flow

1. Fetch the server's public key:
   - MCP tool: `get_wallet_encryption_public_key`
   - HTTP: `GET https://mcp.celina.andrewkimjoseph.com/public-key`
2. Encrypt your key locally:

```bash
npm run encrypt-key -- --url https://mcp.celina.andrewkimjoseph.com --key 0xYOUR_PRIVATE_KEY
```

3. Give the agent the encrypted blob (base64 output) along with your transaction details
4. The agent calls `send_token` with the `encryptedPrivateKey` parameter

The server decrypts the key ephemerally to sign the transaction — it is not stored.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CELO_RPC_URL_MAINNET` | Forno public RPC | Override mainnet RPC |
| `CELO_PRIVATE_KEY` | — | Local stdio write tools only |
| `WALLET_ENCRYPTION_PRIVATE_KEY` | — | RSA private key PEM for HTTP write tools |
| `ALLOWED_HOSTS` | — | Comma-separated custom hostnames (e.g. `mcp.celina.andrewkimjoseph.com`) |
| `PORT` | `10000` | HTTP server port (set by Render) |

Copy `.env.example` to `.env` for local development.

## Known tokens

All supported tokens live in a single registry (`src/config/chains.ts`):

| Category | Symbols |
|----------|---------|
| Native | `CELO` |
| Mento stablecoins | `USDm`, `EURm`, `BRLm`, `XOFm`, `KESm`, `PHPm`, `COPm`, `GBPm`, `CADm`, `AUDm`, `ZARm`, `GHSm`, `NGNm`, `JPYm`, `CHFm` |
| Bridged / third-party | `USDT`, `USDC`, `vEUR`, `vGBP`, `vCHF`, `USDM`, `USDA`, `EURA`, `USDGLO`, `BRLA`, `COPM` |
| GoodDollar | `GoodDollar`, `G$` (`0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A`) |

Token symbols are resolved case-insensitively. Legacy aliases `cUSD` and `cEUR` map to `USDm` and `EURm`. You can also pass any ERC-20 contract address directly.

- `get_celo_balances` — check specific tokens (defaults to `CELO` + `USDm`)
- `get_stablecoin_balances` — scan all registry stablecoins in one call (omits zero balances by default)

## Tools (v0.2)

| Tool | Type | Description |
|------|------|-------------|
| `get_network_status` | read | Mainnet chain ID, block, gas price |
| `get_block` | read | Block by number/hash/latest |
| `get_latest_blocks` | read | Recent blocks |
| `get_transaction` | read | Tx + receipt |
| `get_account` | read | CELO balance, nonce |
| `get_celo_balances` | read | CELO + ERC-20 balances (default: CELO + USDm) |
| `get_stablecoin_balances` | read | All registry stablecoins including GoodDollar |
| `get_token_info` | read | Token metadata |
| `get_wallet_encryption_public_key` | read | RSA public key for encrypting private keys |
| `estimate_send` | read* | Gas estimate (*needs encrypted or env key) |
| `send_token` | write | Send CELO or ERC-20 |
| `get_mento_fx_quote` | read | Mento FX expected output (no wallet) |
| `estimate_mento_fx` | read* | Mento FX gas estimate (*needs encrypted or env key) |
| `execute_mento_fx` | write | Execute Mento FX conversion |
| `supply_aave_usdt` | write | Supply USDT to Aave V3 on Celo |
| `withdraw_aave_usdt` | write | Withdraw USDT from Aave V3 on Celo |

## Adding a new tool

1. Create `src/tools/my-feature.tools.ts` implementing `ToolModule`:

```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AppContext } from "../context/app-context.js";
import type { ToolModule } from "./types.js";

export const myFeatureTools: ToolModule = {
  register(server, ctx) {
    server.registerTool("my_tool", { /* ... */ }, async (args) => { /* ... */ });
  },
};
```

2. Append to `toolModules` in `src/tools/index.ts`.
3. Add domain logic in `src/services/` if needed.
4. Rebuild: `npm run build`.

No changes to `src/index.ts` or server bootstrap required.

## Roadmap

- [x] Mento FX routing (`get_mento_fx_quote`, `estimate_mento_fx`, `execute_mento_fx`)
- [x] Aave lending tools (`supply_aave_usdt`, `withdraw_aave_usdt`)
- [ ] Self proof verification (`ai.self.xyz`)
- [ ] Self Agent ID check

## Development

```bash
npm run dev          # watch TypeScript
npm run inspect      # MCP Inspector UI (stdio)
npm run start:http   # HTTP server on PORT (default 10000)
npm run encrypt-key  # encrypt a private key for write tools
```

## License

MIT
