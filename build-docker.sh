#!/bin/bash

# Script to build Docker image with VITE_ environment variables from apps/web/.env.local
# Usage: ./build-docker.sh

set -e

ENV_FILE="apps/web/.env.local"
DOCKER_IMAGE="qwery-core"
DOCKERFILE="Dockerfile"

# Check if .env.local exists
if [ ! -f "$ENV_FILE" ]; then
  echo "Warning: $ENV_FILE not found. Building without VITE_ build args."
  docker buildx build --platform linux/amd64 -t "$DOCKER_IMAGE" -f "$DOCKERFILE" .
  exit 0
fi

# Array to store build args
BUILD_ARGS=()

# Read the .env.local file and extract VITE_ variables
while IFS= read -r line || [ -n "$line" ]; do
  # Skip empty lines and comments
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
  
  # Remove leading/trailing whitespace
  line=$(echo "$line" | xargs)
  
  # Check if line starts with VITE_
  if [[ "$line" =~ ^VITE_ ]]; then
    # Extract key and value
    if [[ "$line" =~ ^([^=]+)=(.*)$ ]]; then
      key="${BASH_REMATCH[1]}"
      value="${BASH_REMATCH[2]}"
      
      # Remove quotes if present
      value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
      
      # Replace localhost with host.docker.internal for VITE_SUPABASE_URL
      # This allows the container to access Supabase running on the host
      if [ "$key" = "VITE_SUPABASE_URL" ]; then
        value=$(echo "$value" | sed 's/localhost/host.docker.internal/g')
      fi
      
      # Add to build args array
      BUILD_ARGS+=("--build-arg")
      BUILD_ARGS+=("$key=$value")
    fi
  fi
done < "$ENV_FILE"

# Build the docker command
CMD=(
  "docker" "buildx" "build"
  "--platform" "linux/amd64"
  "-t" "$DOCKER_IMAGE"
  "-f" "$DOCKERFILE"
)

# Add build args to command
CMD+=("${BUILD_ARGS[@]}")

# Add the build context
CMD+=(".")

# Print the command (for debugging)
echo "Building Docker image with the following VITE_ variables:"
for ((i=0; i<${#BUILD_ARGS[@]}; i+=2)); do
  echo "  ${BUILD_ARGS[i]} ${BUILD_ARGS[i+1]}"
done
echo ""

# Execute the docker build command
"${CMD[@]}"

