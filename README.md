<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/andrewkimjoseph/celina-mcp/main/assets/logo-yellow.png">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/andrewkimjoseph/celina-mcp/main/assets/logo-black.png">
    <img src="https://raw.githubusercontent.com/andrewkimjoseph/celina-mcp/main/assets/logo-black.png" alt="Celina logo — C with profile silhouette" width="160">
  </picture>
</p>

<h1 align="center">Celina — Celo MCP Server</h1>

<p align="center">
  <strong>Celina</strong> is an open-source <a href="https://modelcontextprotocol.io">Model Context Protocol</a> server that gives LLMs read + write access to <strong>Celo mainnet</strong> — balances, stablecoins, sends, and chain reads.
</p>

<p align="center">
  <a href="https://celina.andrewkimjoseph.com">Website</a>
  ·
  <a href="https://www.npmjs.com/package/@andrewkimjoseph/celina-mcp">npm</a>
  ·
  <a href="https://mcp.usecelina.xyz/api/mcp">Hosted (read-only)</a>
</p>

## Install

```bash
npm i @andrewkimjoseph/celina-mcp@latest
```

## Migration

If you still use `@andrewkimjoseph/celina`, update your MCP config `args` to `@andrewkimjoseph/celina-mcp` and rename the server key to `celina-mcp`. The old package name remains published as a wrapper through one release cycle.

## Quick start

**Recommended:** install locally and connect over stdio — full tool support (including writes with your own keys), no cold starts, and keys stay on your machine.

Your MCP client (Cursor, Claude Desktop, LM Studio, etc.) spawns Celina as a child process via `npx`. See [Local stdio (recommended)](#local-stdio-recommended).

For read-only chain queries without a local install, a hosted endpoint is available at [https://mcp.usecelina.xyz/api/mcp](https://mcp.usecelina.xyz/api/mcp) — see [Hosted (read-only)](#hosted-read-only).

## MCP setup

Pick your client, install the package, paste the config, restart. Celina shows up as MCP tools your LLM can call.

### Local stdio (recommended)

Install the package, then add Celina to your MCP config. Your client spawns `npx` and talks to Celina over stdio. Works in any stdio client (Cursor, Claude Desktop, LM Studio, Continue, MCP Inspector). Requires Node.js ≥ 20.

1. Run `npm i @andrewkimjoseph/celina-mcp` (optional but recommended — caches the package locally for faster MCP startup)
2. Open your MCP config (e.g. `claude_desktop_config.json`, Cursor **Settings → MCP**) and merge the snippet below into `mcpServers`
3. Restart the client

```json
{
  "mcpServers": {
    "celina-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@andrewkimjoseph/celina-mcp"],
      "env": {
        "CELO_PRIVATE_KEY": "0x...",
        "SELF_AGENT_PRIVATE_KEY": "0x..."
      }
    }
  }
}
```

Keep `CELO_PRIVATE_KEY` and `SELF_AGENT_PRIVATE_KEY` out of source control — they stay on your machine. Omit both for read-only chain queries.

### Claude Desktop

Use the same stdio config in `claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`). Requires Node.js ≥ 20.

```json
{
  "mcpServers": {
    "celina-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@andrewkimjoseph/celina-mcp"],
      "env": {
        "CELO_PRIVATE_KEY": "0x...",
        "SELF_AGENT_PRIVATE_KEY": "0x..."
      }
    }
  }
}
```

Fully quit and relaunch Claude Desktop after editing the config (closing the window is not enough).

### Local stdio (from source)

For development from a cloned repo, point at your local `build/index.js`:

```json
{
  "mcpServers": {
    "celina-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/celina-mcp/build/index.js"],
      "env": {
        "CELO_PRIVATE_KEY": "0x...",
        "SELF_AGENT_PRIVATE_KEY": "0x..."
      }
    }
  }
}
```

## Run Celina with your own model

Celina is a plain MCP server. Pair it with any MCP-aware local stack — Ollama, LM Studio, llama.cpp — through a client that supports tool calling.

Read-only tools (balances, blocks, GoodDollar status, etc.) work out of the box. For write tools, set `CELO_PRIVATE_KEY` in the MCP server `env` block.

### LM Studio (0.3.17+)

Native MCP hosting via `mcp.json`.

1. **Program** → **Install** → **Edit mcp.json**
2. Add Celina under `mcpServers`
3. Enable **Allow calling servers from mcp.json**
4. Chat with a tool-capable model (Qwen 2.5, Llama 3.1+)

```json
{
  "mcpServers": {
    "celina-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@andrewkimjoseph/celina-mcp"],
      "env": {
        "CELO_PRIVATE_KEY": "0x...",
        "SELF_AGENT_PRIVATE_KEY": "0x..."
      }
    }
  }
}
```

Omit `CELO_PRIVATE_KEY` for read-only.

### Continue · VS Code

Agent mode in your editor. Drop a YAML file into your workspace and Continue picks it up in agent mode.

1. Create `.continue/mcpServers/celina-mcp.yaml`
2. Paste the snippet below
3. Switch Continue to agent mode and prompt

```yaml
name: Celina
version: 0.0.1
schema: v1
mcpServers:
  - name: celina-mcp
    type: stdio
    command: npx
    args:
      - "-y"
      - "@andrewkimjoseph/celina-mcp"
```

Alternatively, copy the [local stdio JSON](#local-stdio-recommended) into `.continue/mcpServers/mcp.json` — Continue picks up Claude/Cursor-style configs automatically.

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

## Hosted (read-only)

A public read-only endpoint is available at **https://mcp.usecelina.xyz/api/mcp** (alias: `/mcp`). Use this when you only need chain reads and don't want a local `npx` install.

**Local stdio remains the recommended setup** — it supports write tools with your own keys, Self Agent ID flows, and avoids serverless cold starts.

**Client config (read-only, no local install):**

```json
{
  "mcpServers": {
    "celina-mcp": {
      "url": "https://mcp.usecelina.xyz/api/mcp"
    }
  }
}
```

The hosted service runs on Vercel via [celina-mcp-host](../celina-mcp-host/). Do **not** send private keys to the hosted endpoint — writes are disabled server-side.

**Works without keys:** all `get_*` tools, `resolve_ens`, `get_mento_fx_quote`, `estimate_transaction`, `get_gas_fee_data`, `verify_self_agent`, `lookup_self_agent`, governance/staking/NFT/contract reads, etc.

**Fails gracefully:** `send_token`, `execute_mento_fx`, `supply_aave`, `withdraw_aave`, `estimate_send`, `estimate_mento_fx` (require local `CELO_PRIVATE_KEY` via stdio).

**Unreliable on serverless:** `register_self_agent` / `check_self_registration` — Self sessions are in-memory and do not persist across stateless function invocations.

See [celina-mcp-host/README.md](../celina-mcp-host/README.md) if you want to deploy your own instance.

## Write tools

Set `CELO_PRIVATE_KEY` in your MCP server `env` block for on-chain writes (`send_token`, `estimate_send`, `execute_mento_fx`, `supply_aave`, `withdraw_aave`). Use `SELF_AGENT_PRIVATE_KEY` for Self agent signing tools. Keys stay on your machine and are not sent to Celina's authors.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CELO_PRIVATE_KEY` | — | Write tools (send, Mento FX, Aave) |
| `SELF_AGENT_PRIVATE_KEY` | — | Self Agent ID signing/identity tools (separate from CELO wallet) |
| `SELF_AGENT_API_BASE` | `https://app.ai.self.xyz` | Override Self Agent ID REST API base URL |
| `CELO_RPC_URL_MAINNET` | Forno public RPC | Override mainnet RPC |

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

## Tools (v0.7)

| Tool | Type | Description |
|------|------|-------------|
| `get_network_status` | read | Mainnet chain ID, block, gas price |
| `get_block` | read | Block by number/hash/latest (optional `includeTransactions`) |
| `get_latest_blocks` | read | Recent blocks (optional `offset`, up to 100) |
| `get_transaction` | read | Tx + receipt |
| `get_account` | read | CELO balance, nonce |
| `resolve_ens` | read | Resolve Celo or Ethereum ENS name |
| `get_celo_balances` | read | CELO + ERC-20 balances (default: CELO + USDm) |
| `get_stablecoin_balances` | read | All registry stablecoins including GoodDollar |
| `get_token_info` | read | Token metadata |
| `get_token_balance` | read | ERC-20 balance by contract address |
| `get_gas_fee_data` | read | Current gas fees (EIP-1559 when supported) |
| `estimate_transaction` | read | Generic tx gas estimate (from/to/value/data) |
| `estimate_send` | read* | Token send gas estimate (*needs `CELO_PRIVATE_KEY`) |
| `send_token` | write | Send CELO or ERC-20 |
| `get_mento_fx_quote` | read | Mento FX expected output (no wallet) |
| `estimate_mento_fx` | read* | Mento FX gas estimate (*needs `CELO_PRIVATE_KEY`) |
| `execute_mento_fx` | write | Execute Mento FX conversion |
| `supply_aave` | write | Supply tokens to Aave V3 on Celo (USDT, WETH, USDm, USDC, CELO, EURm) |
| `withdraw_aave` | write | Withdraw tokens from Aave V3 on Celo |
| `get_gooddollar_whitelisting_info` | read | GoodDollar IdentityV4 whitelist status |
| `get_governance_proposals` | read | Celo governance proposals (paginated) |
| `get_proposal_details` | read | Governance proposal details + CGP content |
| `get_staking_balances` | read | Staking votes by validator group |
| `get_activatable_stakes` | read | Pending stakes ready to activate |
| `get_validator_groups` | read | Validator groups (paginated) |
| `get_validator_group_details` | read | Single validator group details |
| `get_total_staking_info` | read | Network-wide staking totals |
| `get_nft_info` | read | NFT token info + metadata |
| `get_nft_balance` | read | NFT balance (ERC-721 or ERC-1155) |
| `call_contract_function` | read | Read-only contract call (caller ABI) |
| `estimate_contract_gas` | read | Contract function gas estimate (caller ABI) |
| `verify_self_agent` | read | Verify Self Agent ID on-chain by address |
| `lookup_self_agent` | read | Look up Self agent by numeric ID (ai.self.xyz) |
| `verify_self_request` | read | Verify signed Self Agent HTTP request headers |
| `register_self_agent` | write | Start Self agent registration (QR/deep link) |
| `check_self_registration` | read* | Poll registration/refresh/deregister session (*may return private key) |
| `get_self_identity` | read* | Current Self agent identity (*needs agent key) |
| `refresh_self_proof` | write | Renew human proof after on-chain expiry (`isProofFresh` false) |
| `deregister_self_agent` | write | Irreversibly revoke Self agent identity |
| `sign_self_request` | read* | Sign HTTP request with Self agent headers (*needs agent key) |
| `authenticated_self_fetch` | write | HTTP fetch with Self agent auth (*needs agent key) |

### Self Agent ID notes

- **Registration lifecycle APIs** (`register_self_agent`, `refresh_self_proof`, `deregister_self_agent`) use `network: "mainnet"` in the Self REST API request body.
- **Demo and gated HTTP endpoints** (e.g. `https://app.ai.self.xyz/api/demo/verify`) require the query param **`network=celo-mainnet`**, not `network=mainnet`.
- **QR scan URLs** use `/scan/{sessionToken}`, not `/qr/...`.
- **`refresh_self_proof`** only starts after on-chain proof expiry (`isProofFresh` is false); while fresh it returns a clear error instead of a QR that will fail on-chain. The 30-day `is_expiring_soon` flag (matching Self SDK `isProofExpiringSoon`) is for warnings only. Self SDK also documents deregister → re-register as an alternative renewal path.

Example authenticated demo call:

```text
authenticated_self_fetch
  method: POST
  url: https://app.ai.self.xyz/api/demo/verify?network=celo-mainnet
  body: {}
```

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

## For developers

### Architecture split

Read-only chain logic comes from [`@andrewkimjoseph/celina-sdk`](https://www.npmjs.com/package/@andrewkimjoseph/celina-sdk) via [`src/context/app-context.ts`](src/context/app-context.ts). Write paths use local wallet-backed services that sign with `CELO_PRIVATE_KEY`:

| Layer | Source | Examples |
|-------|--------|----------|
| Reads | celina-sdk | balances, blocks, FX quotes, GoodDollar status, ENS |
| Writes | Local services | `send_token`, `execute_mento_fx`, `supply_aave`, `withdraw_aave` |
| Self Agent ID | Local `SelfService` | registration, proof refresh, authenticated fetch (`SELF_AGENT_PRIVATE_KEY`) |

Self Agent ID is **not** in celina-sdk. For frontend Self flows use [`@selfxyz/agent-sdk`](https://www.npmjs.com/package/@selfxyz/agent-sdk).

### Directory map

| Path | Purpose |
|------|---------|
| `src/index.ts` | stdio MCP bootstrap — loads env, connects transport |
| `src/server/` | `createServer()` factory and LLM instructions |
| `src/context/` | Composes SDK read services + wallet-backed write services |
| `src/tools/` | One file per domain; all registered in `src/tools/index.ts` |
| `src/services/` | Execute/sign implementations (not exported by SDK) |
| `src/config/` | Env, token registry, Self/Aave constants |

### Tool module pattern

Each tool file exports a `ToolModule` with `register(server, ctx)`. See [Adding a new tool](#adding-a-new-tool) above — append new modules to `toolModules` in `src/tools/index.ts`.

### Local development

```bash
npm run dev          # watch TypeScript → build/
npm run inspect      # MCP Inspector UI over stdio
```

Point your MCP client at the built entry for source development:

```json
"args": ["/absolute/path/to/celina-mcp/build/index.js"]
```

Copy `.env.example` to `.env` for `CELO_PRIVATE_KEY`, `SELF_AGENT_PRIVATE_KEY`, and RPC overrides.

## Roadmap

- [x] Mento FX routing (`get_mento_fx_quote`, `estimate_mento_fx`, `execute_mento_fx`)
- [x] Aave lending tools (`supply_aave`, `withdraw_aave`) — USDT, WETH, USDm, USDC, CELO, EURm
- [x] Self proof verification (`verify_self_agent`, `verify_self_request`, `ai.self.xyz`)
- [x] Self Agent ID check (`lookup_self_agent`, registration & lifecycle tools)

## Development

```bash
npm run dev          # watch TypeScript
npm run inspect      # MCP Inspector UI (stdio)
```

## License

MIT
