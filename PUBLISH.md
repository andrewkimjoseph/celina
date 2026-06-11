# Celina meta-repo workflow

This document is the source of truth for working in the Celina meta-repository. Every change — code, docs, or releases — follows the same core loop.

## Core loop (always)

**Change in submodule → push submodule → bump pointer in parent.**

| Step | Where | Action |
|------|-------|--------|
| 1 | `celina-sdk/`, `celina-mcp/`, `celina-mcp-host/`, or `celina-website/` | Commit and push to that repo's `main` |
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
2. Bump the version for the SDK (`celina-sdk/`) then ask me for the OTP to publish. Do not try to publish without asking for the OTP — you will get an EOTP error.
3. Bump the version of the MCP (`celina-mcp/`) then ask me for the OTP to publish. Do not try to publish without asking for the OTP — you will get an EOTP error.
4. Update dependencies for MCP HOST (`celina-mcp-host/`).
5. **Celeste AI** lives outside this meta-repo ([celeste-ai](https://github.com/andrewkimjoseph/celeste-ai)). Update its SDK dependency separately when needed.
6. With as many commits as you can, commit all changes and push — in each submodule repo, then bump submodule pointers in this parent repo if needed.

## Agent completion checklist

Before marking a task done:

- [ ] `./scripts/status-all.sh` shows no dirty submodules with unpushed commits (unless explicitly left as WIP)
- [ ] Parent repo has no stale submodule pointers for submodules that were pushed
- [ ] If versions were bumped: publish order in **Releases** above was followed
