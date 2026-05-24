#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "[pre-push] Biome check (all)…"
# Match CI (`bun run lint`): warnings are advisory, only errors block. The repo's
# biome.json intentionally sets several rules (e.g. noNonNullAssertion) to "warn".
bun x biome check

echo "[pre-push] typecheck (full)…"
bun run typecheck

echo "[pre-push] dependency-cruiser (full)…"
bun x depcruise --config tooling/dep-cruiser.config.cjs apps packages

echo "[pre-push] bun test --coverage…"
bun test --coverage

echo "[pre-push] privacy invariants…"
bun run check:privacy

echo "[pre-push] audit…"
bun pm audit || echo "[pre-push] audit returned non-zero — review above"

echo "[pre-push] OK"
