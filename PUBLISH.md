# Celina meta-repo workflow

This document is the source of truth for working in the Celina meta-repository. Every change — code, docs, or releases — follows the same core loop.

## Core loop (always)

**Change in submodule → push submodule → bump pointer in parent.**

| Step | Where | Action |
|------|-------|--------|
| 1 | `celina-sdk/`, `celina-mcp/`, `celina-mcp-remote/`, `celina-website/`, `celeste-ai/`, `celina-api/`, or `celina-bot/` | Commit and push to that repo's `main` |
| 2 | Parent `celina/` | `git add <submodule> && git commit -m "Bump <submodule>"` — or `./scripts/bump-submodule.sh <submodule>` |
| 3 | Parent `celina/` | `git push` |

Example after editing the SDK:

```bash
cd celina-sdk
git add -A && git commit -m "Your message" && git push

cd ..
./scripts/bump-submodule.sh celina-sdk
git push
```

### Anti-patterns

Do **not**:

- Commit source code only in the parent repo — the parent tracks submodule pointers, not package source
- Bump the parent pointer before the submodule commit is pushed to its remote
- Finish work with `git status` showing `m celina-sdk` (or similar) in the parent

### Health check

Run before and after any task:

```bash
./scripts/status-all.sh
```

## Releases (npm)

When releasing packages to npm, complete the core loop for each change first, then follow this order. Run version bumps and publish commands from the relevant submodule directory.

1. Complete the core loop for each package change in `celina-sdk/`.
2. Bump the version for the SDK (`celina-sdk/`) then publish.
3. Bump the version of the MCP (`celina-mcp/`), set an **exact** `@andrewkimjoseph/celina-sdk` version (no `^`) matching the SDK you just published, then publish.
4. Update **only** `@andrewkimjoseph/celina-mcp` in MCP remote (`celina-mcp-remote/`). Do not list `celina-sdk` or swap libs directly on the remote deploy — they install transitively through celina-mcp.
5. Bump `@andrewkimjoseph/celina-sdk` in `celeste-ai/` (exact version, no `^`), commit, push, then `./scripts/bump-submodule.sh celeste-ai`. Celeste deploys from its own repo on Vercel — not npm.
6. Bump `@andrewkimjoseph/celina-sdk` in `celina-api/` (exact version, no `^`) when the HTTP API should pick up catalog changes. Celina API is a Cloudflare Worker — not npm.
7. Bump `@andrewkimjoseph/celina-sdk` in `celina-bot/` (exact version, no `^`) and run `npm run sync-aliases` when the Telegram bot should pick up catalog changes. Celina bot is a Cloudflare Worker — not npm.
8. With as many commits as you can, commit all changes and push — in each submodule repo, then bump submodule pointers in this parent repo if needed.

## Agent completion checklist

Before marking a task done:

- [ ] `./scripts/status-all.sh` shows no dirty submodules with unpushed commits (unless explicitly left as WIP)
- [ ] Parent repo has no stale submodule pointers for submodules that were pushed
- [ ] If versions were bumped: publish order in **Releases** above was followed
