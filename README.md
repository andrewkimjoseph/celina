# Celina

Meta-repository for the [Celina](https://usecelina.xyz) agent stack on Celo mainnet — one clone for the SDK, MCP server, hosted endpoint, website, Celeste wallet chat UI, read-only HTTP API, and Telegram bot.

## Repositories

| Submodule | Link | Description |
|-----------|------|-------------|
| [celina-sdk](https://github.com/andrewkimjoseph/celina-sdk) | [usecelina.xyz/sdk](https://usecelina.xyz/sdk) | Shared TypeScript SDK and LLM tool catalog |
| [celina-mcp](https://github.com/andrewkimjoseph/celina-mcp) | [usecelina.xyz/mcp](https://usecelina.xyz/mcp) | MCP server for local stdio agents |
| [celina-mcp-remote](https://github.com/andrewkimjoseph/celina-mcp-remote) | [usecelina.xyz/mcp/remote](https://usecelina.xyz/mcp/remote) | Vercel-hosted read-only remote MCP endpoint |
| [celina-website](https://github.com/andrewkimjoseph/celina-website) | [usecelina.xyz](https://usecelina.xyz) | Docs, stats dashboard, and marketing site |
| [celeste-ai](https://github.com/andrewkimjoseph/celeste-ai) | [celeste.usecelina.xyz](https://celeste.usecelina.xyz) | Wallet chat UI — SDK browser surface, wagmi signing, confirm-card simulation |
| [celina-api](https://github.com/andrewkimjoseph/celina-api) | [usecelina.xyz/api](https://usecelina.xyz/api) | Public read-only REST over SDK `read` tools (Hono) |
| [celina-bot](https://github.com/andrewkimjoseph/celina-bot) | [@thecelinabot](https://t.me/thecelinabot) | Telegram bot over the Celina API |

Each submodule is an independent git repository with its own history, CI, and deploy targets. npm dependencies link packages (`celina-sdk` → `celina-mcp` → remote; `celina-sdk` → `celeste-ai`; `celina-sdk` → `celina-api`). `celina-bot` calls the public API at runtime (SDK is a bot **devDependency** for alias generation only).

## Clone

```bash
git clone --recurse-submodules https://github.com/andrewkimjoseph/celina.git
cd celina
```

If you already cloned without submodules:

```bash
git submodule update --init --recursive
```

## Day-to-day workflow

| Task | Command |
|------|---------|
| Pull latest everywhere | `git pull && git submodule update --init --recursive` |
| Status across submodules | `./scripts/status-all.sh` |
| Work in one package | `cd celina-sdk` — commit and push in the submodule repo as usual |
| Bump submodule pointer | `./scripts/bump-submodule.sh celina-sdk` then `git push` |
| Workflow & releases (read first) | See [PUBLISH.md](PUBLISH.md) |

Agents: the [celina-meta-repo](.cursor/skills/celina-meta-repo/SKILL.md) skill applies in this repo.

After cloning, run `npm install` in each submodule you work in (`celina-sdk`, `celina-mcp`, `celina-mcp-remote`, `celina-website`, `celeste-ai`, `celina-api`, `celina-bot`).
