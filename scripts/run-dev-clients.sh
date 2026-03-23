#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=/dev/null
source "$ROOT/scripts/lib-dev-client-args.sh"
MODE="${1:-regular}"
[[ $# -gt 0 ]] && shift
normalize_dev_client_args "$@"
set -- "${NORMALIZED_ARGS[@]}"

cd "$ROOT"

if [[ $# -eq 0 ]]; then
  mapfile -t CLIENTS < <(normalize_clients_list web tui)
else
  mapfile -t CLIENTS < <(normalize_clients_list "$@")
fi

is_linked_worktree() {
  [[ -f "$ROOT/.git" ]]
}

sanitize_branch_for_host() {
  local raw=$1
  local cleaned
  cleaned=$(printf '%s' "$raw" | tr '[:upper:]' '[:lower:]')
  cleaned=$(printf '%s' "$cleaned" | tr '/._' '-')
  cleaned=$(printf '%s' "$cleaned" | sed -E 's/[^a-z0-9-]+/-/g; s/^-+//; s/-+$//; s/-+/-/g')
  printf '%s' "$cleaned"
}

compute_portless_api_host() {
  local base='api.qwery.localhost:1355'
  if ! is_linked_worktree; then
    printf '%s' "$base"
    return 0
  fi

  local branch slug
  branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)
  slug=$(sanitize_branch_for_host "$branch")
  if [[ -n "$slug" && "$slug" != "head" ]]; then
    printf '%s' "${slug}.${base}"
  else
    printf '%s' "$base"
  fi
}

if [[ "$MODE" == "portless" ]]; then
  if printf '%s\n' "${CLIENTS[@]}" | grep -qx web; then
    PORTLESS_API_HOST="${QWERY_PORTLESS_API_HOST:-$(compute_portless_api_host)}"
    export VITE_API_URL="${VITE_API_URL:-http://${PORTLESS_API_HOST}/api}"
    export VITE_DEV_API_PROXY="${VITE_DEV_API_PROXY:-http://${PORTLESS_API_HOST}}"
  fi
fi

PIDS=()

# cleanup_dev_clients() runs only via EXIT/INT/TERM traps (indirect invocation).
# shellcheck disable=SC2317
cleanup_dev_clients() {
  # Only run when we actually have child process IDs.
  if [[ ${#PIDS[@]} -eq 0 ]]; then
    return 0
  fi

  for p in "${PIDS[@]}"; do
    kill -TERM "$p" 2>/dev/null || true
    pkill -TERM -P "$p" 2>/dev/null || true
  done
}
trap cleanup_dev_clients EXIT INT TERM

start() {
  "$@" &
  PIDS+=($!)
}

# Launch mapping must stay in sync with QWERY_DEV_CLIENT_IDS in lib-dev-client-args.sh
for c in "${CLIENTS[@]}"; do
  case "$c" in
    web)
      if [[ "$MODE" == "portless" ]]; then
        start pnpm web:dev:portless
      else
        start pnpm web:dev
      fi
      ;;
    tui) start pnpm tui:dev ;;
    desktop) start pnpm desktop:dev ;;
  esac
done

finalize_dev_clients_wait() {
  local i pid
  if [[ ${BASH_VERSINFO[0]} -gt 4 ]] ||
    { [[ ${BASH_VERSINFO[0]} -eq 4 ]] && [[ ${BASH_VERSINFO[1]} -ge 3 ]]; }; then
    for ((i = 0; i < ${#PIDS[@]}; i++)); do
      wait -n || exit $?
    done
    exit 0
  fi
  for pid in "${PIDS[@]}"; do
    wait "$pid" || exit $?
  done
  exit 0
}
finalize_dev_clients_wait
