#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

CHANGED=$(git diff --cached --name-only --diff-filter=ACMR -- '*.ts' '*.tsx' '*.json' || true)
if [ -z "$CHANGED" ]; then
  exit 0
fi

echo "[pre-commit] Biome check…"
# Match CI (`bun run lint`): warnings are advisory, only errors block. The repo's
# biome.json intentionally sets several rules (e.g. noNonNullAssertion) to "warn".
bun x biome check $CHANGED

echo "[pre-commit] typecheck…"
bun run typecheck

echo "[pre-commit] dependency-cruiser…"
bun x depcruise --config tooling/dep-cruiser.config.cjs apps packages

if command -v gitleaks >/dev/null 2>&1; then
  echo "[pre-commit] gitleaks…"
  gitleaks protect --staged --redact --no-banner
else
  echo "[pre-commit] gitleaks not installed — skipping secret scan (recommended: brew install gitleaks)"
fi

echo "[pre-commit] OK"
