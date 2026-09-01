---
name: celina-meta-repo
description: >
  Celina meta-repository workflow: git submodule edits, push submodule,
  bump parent pointer, and npm publish order. Use when working in the celina
  meta-repo, committing or pushing in celina-sdk/celina-mcp/celina-mcp-remote/
  celina-website/celeste-ai/celina-api/celina-bot, bumping submodule pointers, publishing
  @andrewkimjoseph/celina-sdk or celina-mcp, or asking about celina repo structure.
---

# Celina meta-repo

Read [PUBLISH.md](../../../PUBLISH.md) first — it is the source of truth for this repository.

## Default workflow

Every change follows the same loop:

1. **Edit in submodule** — `cd celina-sdk` (or `celina-mcp`, `celina-mcp-remote`, `celina-website`, `celeste-ai`, `celina-api`, `celina-bot`) and make changes there
2. **Push submodule** — commit and push to that repo's `main`
3. **Bump parent pointer** — from the parent `celina/` root: `./scripts/bump-submodule.sh <submodule>` then `git push`

Never commit source code only in the parent repo. Never bump the parent before the submodule is pushed.

## Where to work

| Submodule | Purpose |
|-----------|---------|
| `celina-sdk/` | `@andrewkimjoseph/celina-sdk` — shared TypeScript SDK and tool catalog |
| `celina-mcp/` | `@andrewkimjoseph/celina-mcp` — local stdio MCP server |
| `celina-mcp-remote/` | Vercel deploy → mcp.usecelina.xyz |
| `celina-website/` | Vercel deploy → usecelina.xyz |
| `celeste-ai/` | Vercel deploy → celeste.usecelina.xyz — wallet chat UI (SDK browser surface) |
| `celina-api/` | Cloudflare Workers → api.usecelina.xyz — public read-only REST over SDK read tools |
| `celina-bot/` | Cloudflare Workers → bot.usecelina.xyz — Telegram bot over Celina API |

## Before finishing any task

- [ ] Run `./scripts/status-all.sh` — no dirty submodules with unpushed commits (unless WIP)
- [ ] Parent has no stale submodule pointers for repos that were pushed
- [ ] If versions bumped: follow publish order in PUBLISH.md

## Publishing

Defer to **Releases** in [PUBLISH.md](../../../PUBLISH.md). Publish with `npm publish` using the configured npm access token (no OTP step in this environment).

Order: SDK → MCP → update mcp-remote deps → bump SDK in celeste-ai → push all submodules → bump parent pointers.

## Commands

```bash
# Pull latest everywhere
git pull && git submodule update --init --recursive

# Status across all repos
./scripts/status-all.sh

# Bump parent pointer after submodule push
./scripts/bump-submodule.sh celina-sdk
git push
```
