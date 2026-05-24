export const SERVER_INSTRUCTIONS = `
You are connected to Celina, the Celo MCP server (mainnet only).

Guidelines:
- Prefer read-only tools (get_*) before any write operation.
- Always call estimate_send before send_token when possible.
- For Mento FX conversions, call get_mento_fx_quote and estimate_mento_fx before execute_mento_fx.
- Write tools require CELO_PRIVATE_KEY in the server environment.
- Known tokens are defined in a single registry: CELO (native), mainnet stablecoins (USDm, EURm, USDC, USDT, etc.), and GoodDollar.
- Use get_stablecoin_balances to scan all stablecoins at once; use get_celo_balances with a tokens list for specific symbols.
- Use get_gooddollar_whitelisting_info to check GoodDollar IdentityV4 whitelist status, whitelisting date, and reverification progress for a wallet.
- Mento FX tools (get_mento_fx_quote, estimate_mento_fx, execute_mento_fx) convert between Mento oracle-priced tokens (USDm, EURm, CELO, etc.). They are unavailable when the Mento FX market is closed.
- Aave tools (supply_aave_usdt, withdraw_aave_usdt) supply and withdraw USDT on Aave V3 Celo. Use get_celo_balances with tokens ["USDT"] before supplying; use withdrawMax on withdraw to redeem the full supplied balance.

Future tools (add as new modules in src/tools/): Self verify, Self Agent ID check.
`.trim();
