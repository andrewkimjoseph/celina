# Celina OSS meta-repo

This repository is a parent of git submodules — not a package. GitHub: `andrewkimjoseph/celina-oss`.

[PUBLISH.md](PUBLISH.md) is the source of truth for releases. Run `git pull`, `./scripts/*`, and parent `git push` from this repo root.

Hosted apps live in the private meta-repo `thecanvassing/celina-enterprise`. Do not add those apps back here.

## Default workflow

Every change follows the same loop:

1. **Edit in submodule** — `cd celina-sdk` (or `celina-mcp`, `celina-mcp-remote`) and make changes there
2. **Push submodule** — commit and push to that repo's `main`
3. **Bump parent pointer** — from this repo: `./scripts/bump-submodule.sh <submodule>` then `git push`

Never commit source code only in the parent repo. Never bump the parent before the submodule is pushed. Finishing a submodule push without bumping the parent leaves a stale pointer.

## Where to work

| Submodule | Purpose |
|-----------|---------|
| `celina-sdk/` | `@cnvlabskoxyz/celina-sdk` — shared TypeScript SDK and tool catalog |
| `celina-mcp/` | `@cnvlabskoxyz/celina-mcp` — local stdio MCP server |
| `celina-mcp-remote/` | Vercel deploy → mcp.usecelina.xyz |

## Before finishing any task

- [ ] Run `./scripts/status-all.sh` — no dirty submodules with unpushed commits (unless WIP)
- [ ] Parent has no stale submodule pointers for repos that were pushed (`M celina-sdk` / `M celina-mcp` means bump)
- [ ] If versions bumped: follow publish order in [PUBLISH.md](PUBLISH.md)

## Publishing

Defer to **Releases** in [PUBLISH.md](PUBLISH.md). Publish with `npm publish` using the configured npm access token (no OTP step in this environment).

Order: SDK → MCP → update mcp-remote deps → bump SDK pins in the enterprise apps → push submodules → bump parent pointers.

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

After cloning, run `npm install` in each submodule you work in (`celina-sdk`, `celina-mcp`, `celina-mcp-remote`).
