# Celina

Meta-repository for the [Celina](https://usecelina.xyz) agent stack on Celo mainnet — one clone for the SDK, MCP server, hosted endpoint, and website.

## Repositories

| Submodule | Package / deploy | Description |
|-----------|------------------|-------------|
| [celina-sdk](celina-sdk/) | [`@andrewkimjoseph/celina-sdk`](https://www.npmjs.com/package/@andrewkimjoseph/celina-sdk) | Shared TypeScript SDK and LLM tool catalog |
| [celina-mcp](celina-mcp/) | [`@andrewkimjoseph/celina-mcp`](https://www.npmjs.com/package/@andrewkimjoseph/celina-mcp) | MCP server for local stdio agents |
| [celina-mcp-host](celina-mcp-host/) | [mcp.usecelina.xyz](https://mcp.usecelina.xyz) | Vercel-hosted read-only MCP endpoint |
| [celina-website](celina-website/) | [usecelina.xyz](https://usecelina.xyz) | Docs, stats dashboard, and marketing site |

Each submodule is an independent git repository with its own history, CI, and deploy targets. npm dependencies link packages (`celina-sdk` → `celina-mcp` → host/apps).

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
| Bump submodule pointer | After a submodule merges to `main`: `git add celina-sdk && git commit -m "Bump celina-sdk"` |
| Publish SDK / MCP | See [PUBLISH.md](PUBLISH.md) |

## Related projects

[Celeste AI](https://github.com/andrewkimjoseph/celeste-ai) is a separate wallet chat UI that consumes `@andrewkimjoseph/celina-sdk`. It is not included in this meta-repo.
