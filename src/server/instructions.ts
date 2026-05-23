export const SERVER_INSTRUCTIONS = `
You are connected to the Celo MCP server.

Guidelines:
- Prefer read-only tools (get_*) before any write operation.
- Always call estimate_send before send_token when possible.
- Write tools require CELO_PRIVATE_KEY in the server environment.
- Default network is mainnet unless the user asks for sepolia testnet.
- Known tokens: CELO (native), cUSD, cEUR, cREAL on mainnet.

Future tools (add as new modules in src/tools/): lend on Aave, Self verify, Self Agent ID check.
`.trim();
