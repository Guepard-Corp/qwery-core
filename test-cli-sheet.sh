#!/bin/bash
# Test CLI with Google Sheet query

export AZURE_API_KEY="3894e814ba674c0fa20b932c67334c1c"
export AZURE_RESOURCE_NAME="guepard-agent-rs"
export AZURE_OPENAI_DEPLOYMENT="gpt-5-mini"
export VITE_AGENT_PROVIDER="azure"
export AGENT_PROVIDER="azure"
export VITE_WORKING_DIR="workspace"
export WORKING_DIR="workspace"

cd apps/cli

# Test by creating a notebook and running the query
echo "Testing Google Sheet query via CLI..."
echo "Query: list all data in this sheet https://docs.google.com/spreadsheets/d/1yfjcBF4X8waukFdI5u9ctkagFwAn-BRgM5IUCUK1Ay8/export?fomat=csv"
echo ""

# Initialize workspace
node dist/index.js workspace init <<< ""

# Create a test notebook (we'll use interactive mode to test)
echo "To test, run: node dist/index.js"
echo "Then in interactive mode, type the Google Sheet query"
