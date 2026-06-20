#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

for dir in celina-sdk celina-mcp celina-mcp-host celina-website celeste-ai; do
  echo "=== $dir ==="
  if [[ -d "$dir/.git" || -f "$dir/.git" ]]; then
    git -C "$dir" status -sb
  else
    echo "  (submodule not initialized)"
  fi
  echo
done

echo "=== celina (parent) ==="
git status -sb
