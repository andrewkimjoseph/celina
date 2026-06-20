#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

valid_dirs=(celina-sdk celina-mcp celina-mcp-host celina-website celeste-ai)

usage() {
  echo "Usage: $0 <submodule>" >&2
  echo "  submodule: ${valid_dirs[*]}" >&2
  exit 1
}

[[ $# -eq 1 ]] || usage

dir="$1"
found=0
for d in "${valid_dirs[@]}"; do
  if [[ "$d" == "$dir" ]]; then
    found=1
    break
  fi
done
[[ $found -eq 1 ]] || usage

if [[ ! -d "$dir/.git" && ! -f "$dir/.git" ]]; then
  echo "error: $dir is not initialized (run git submodule update --init)" >&2
  exit 1
fi

if ! git -C "$dir" diff --quiet || ! git -C "$dir" diff --cached --quiet; then
  echo "error: $dir has uncommitted changes — commit and push in the submodule first" >&2
  git -C "$dir" status -sb
  exit 1
fi

upstream="$(git -C "$dir" rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)"
if [[ -z "$upstream" ]]; then
  echo "error: $dir has no upstream branch — push the submodule to origin first" >&2
  exit 1
fi

unpushed="$(git -C "$dir" log "$upstream"..HEAD --oneline 2>/dev/null || true)"
if [[ -n "$unpushed" ]]; then
  echo "error: $dir has unpushed commits — push the submodule first" >&2
  echo "$unpushed"
  exit 1
fi

git add "$dir"
if git diff --cached --quiet; then
  echo "nothing to bump: parent already points at $dir's current commit"
  exit 0
fi

git commit -m "Bump $dir"
echo "Committed parent pointer for $dir. Run: git push"
