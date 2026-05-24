# Celo MCP

Open-source [Model Context Protocol](https://modelcontextprotocol.io) server that gives LLMs read + write access to **Celo mainnet** — balances, stablecoins, sends, swaps (quote stub), and chain reads.

## Quick start (local)

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
4. Your MCP endpoint will be at `https://<service-name>.onrender.com/mcp`

> **Note:** Free Render services spin down after ~15 minutes of inactivity. Cold starts can take 30–60 seconds and may cause MCP client timeouts. Use a Starter plan for always-on hosting.

## Cursor / Claude Desktop config

### Remote (Render — recommended for hackathon)

```json
{
  "mcpServers": {
    "celo": {
      "type": "streamable-http",
      "url": "https://your-service-name.onrender.com/mcp"
    }
  }
}
```

### Local stdio

```json
{
  "mcpServers": {
    "celo": {
      "command": "node",
      "args": ["/absolute/path/to/celo_mcp/build/index.js"]
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

## Write tools (hosted mode)

Write tools (`send_token`, `estimate_send`) accept an RSA-encrypted private key per request — never plaintext.

### Flow

1. Fetch the server's public key:
   - MCP tool: `get_wallet_encryption_public_key`
   - HTTP: `GET https://your-service.onrender.com/public-key`
2. Encrypt your key locally:

```bash
npm run encrypt-key -- --url https://your-service-name.onrender.com --key 0xYOUR_PRIVATE_KEY
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

## Tools (v0.1)

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
| `get_swap_quote` | read | Swap preview (routing stub) |

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

- [ ] Mento / DEX swap routing (`execute_swap`)
- [ ] Aave lending tools
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
