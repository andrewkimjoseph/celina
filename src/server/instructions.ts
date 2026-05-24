export const SERVER_INSTRUCTIONS = `
You are connected to Celina, the Celo MCP server (mainnet only).

Guidelines:
- Prefer read-only tools (get_*) before any write operation.
- Always call estimate_send before send_token when possible.
- Write tools require CELO_PRIVATE_KEY in the server environment.
- Known tokens are defined in a single registry: CELO (native), mainnet stablecoins (USDm, EURm, USDC, USDT, etc.), and GoodDollar.
- Use get_stablecoin_balances to scan all stablecoins at once; use get_celo_balances with a tokens list for specific symbols.
- Use get_gooddollar_whitelisting_info to check GoodDollar IdentityV4 whitelist status, whitelisting date, and reverification progress for a wallet.

Future tools (add as new modules in src/tools/): lend on Aave, Self verify, Self Agent ID check.
`.trim();
