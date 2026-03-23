#!/usr/bin/env bash
# Bootstrap a checkout (especially a git worktree): install deps like a fresh clone,
# copy local .env files from the primary worktree when missing, install VS Code tasks.
# See docs/portless-local-dev.md (Git worktrees).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DO_INSTALL=1
DO_ENV=1
DO_VSCODE=1

usage() {
  cat <<'EOF'
Usage: setup-worktree.sh [options]

  Install dependencies (pnpm install), optionally copy apps/web/.env and
  apps/server/.env from the primary checkout when this worktree does not have them,
  and run setup:vscode.

Options:
  --skip-install   Skip pnpm install
  --no-env-copy    Do not copy .env files
  --no-vscode      Skip VS Code tasks install
  -h, --help       Show this help

Env:
  QWERY_SETUP_ENV_FROM=/path/to/main/repo
    Copy missing .env files from this directory (overrides auto-detect).
EOF
}

while [[ $# -gt 0 ]]; do
  if [[ "$1" == "--" ]]; then
    shift
    continue
  fi
  case "$1" in
    --skip-install) DO_INSTALL=0 ;;
    --no-env-copy) DO_ENV=0 ;;
    --no-vscode) DO_VSCODE=0 ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not a git repository: $ROOT" >&2
  exit 1
fi

discover_primary_worktree() {
  local line wt
  while IFS= read -r line; do
    if [[ "$line" =~ ^worktree[[:space:]]+(.*)$ ]]; then
      wt="${BASH_REMATCH[1]}"
      if git -C "$wt" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        printf '%s' "$wt"
        return 0
      fi
    fi
  done < <(git worktree list --porcelain)
  while IFS= read -r line; do
    if [[ "$line" =~ ^worktree[[:space:]]+(.*)$ ]]; then
      printf '%s' "${BASH_REMATCH[1]}"
      return 0
    fi
  done < <(git worktree list --porcelain)
  return 1
}

copy_env_if_missing() {
  local src_root=$1
  local rel
  for rel in apps/web/.env apps/server/.env; do
    if [[ ! -f "$ROOT/$rel" && -f "$src_root/$rel" ]]; then
      mkdir -p "$(dirname "$ROOT/$rel")"
      cp "$src_root/$rel" "$ROOT/$rel"
      echo "Copied $rel from $src_root"
    fi
  done
}

if [[ "$DO_INSTALL" -eq 1 ]]; then
  echo "Running pnpm install …"
  pnpm install
fi

CURRENT=$(git rev-parse --show-toplevel)
if [[ "$CURRENT" != "$ROOT" ]]; then
  echo "Warning: git top-level ($CURRENT) differs from script root ($ROOT)" >&2
fi

if [[ "$DO_ENV" -eq 1 ]]; then
  if [[ -n "${QWERY_SETUP_ENV_FROM:-}" ]]; then
    if [[ ! -d "$QWERY_SETUP_ENV_FROM" ]]; then
      echo "QWERY_SETUP_ENV_FROM is not a directory: $QWERY_SETUP_ENV_FROM" >&2
      exit 1
    fi
    copy_env_if_missing "$(cd "$QWERY_SETUP_ENV_FROM" && pwd)"
  else
    PRIMARY=""
    PRIMARY=$(discover_primary_worktree) || PRIMARY=""
    if [[ -n "$PRIMARY" && "$PRIMARY" != "$CURRENT" ]]; then
      echo "Primary worktree: $PRIMARY (this checkout: $CURRENT)"
      copy_env_if_missing "$PRIMARY"
    elif [[ -n "$PRIMARY" ]]; then
      echo "Single / primary checkout — no other worktree to copy .env from."
    fi
  fi
  for rel in apps/web/.env apps/server/.env; do
    if [[ ! -f "$ROOT/$rel" ]]; then
      echo "Missing $rel — copy from ${rel}.example or your secrets manager."
    fi
  done
fi

if [[ "$DO_VSCODE" -eq 1 ]]; then
  bash "$ROOT/scripts/setup-vscode.sh"
fi

echo "Done."
