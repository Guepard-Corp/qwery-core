#!/usr/bin/env bash
set -euo pipefail

# Allow user to override MODEL_PATH / PORT via env
MODEL_PATH="${MODEL_PATH:-/models/tinyllama-1.1b-chat-v1.0-q4_k_m.gguf}"
PORT="${LLAMA_SERVER_PORT:-4040}"
THREADS="${LLAMA_THREADS:-$(nproc)}"

# locate server binary (choices depending on build)
LLAMA_ROOT="/opt/llama.cpp"
CANDIDATES=(
  "${LLAMA_ROOT}/build/bin/llama-server"
  "${LLAMA_ROOT}/llama-server"
  "${LLAMA_ROOT}/server"
  "${LLAMA_ROOT}/examples/server/server"
)

SERVER_BIN=""
for c in "${CANDIDATES[@]}"; do
  if [ -x "$c" ]; then
    SERVER_BIN="$c"
    break
  fi
done

if [ -z "$SERVER_BIN" ]; then
  echo "ERROR: llama.cpp server binary not found. Build may have failed."
  ls -la "${LLAMA_ROOT}"
  exit 1
fi

if [ ! -f "$MODEL_PATH" ]; then
  echo "ERROR: model file not found at ${MODEL_PATH}"
  echo "Mount your model into the container (e.g. -v /host/path/model.gguf:${MODEL_PATH}) or set MODEL_PATH env var."
  exit 1
fi

echo "Starting llama.cpp server:"
echo "  binary: $SERVER_BIN"
echo "  model:  $MODEL_PATH"
echo "  port:   $PORT"
echo "  threads:$THREADS"

# Run the server. tweak args as needed; --port and -m are common flags for the server example
exec "$SERVER_BIN" -m "${MODEL_PATH}" --host 0.0.0.0 --port "${PORT}" --threads "${THREADS}"
