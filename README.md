![Guepard](/resources/guepard-cover.png)

<div align="center">
    <h1>The Boring Qwery Platform - Connect and query anything</h1>
    <br />  
    <p align="center">
    <a href="https://youtu.be/WlOkLnoY2h8?si=hb6-7kLhlOvVL1u6">
        <img src="https://img.shields.io/badge/Watch-YouTube-%23ffcb51?logo=youtube&logoColor=black" alt="Watch on YouTube" />
    </a>
    <a href="https://discord.gg/nCXAsUd3hm">
        <img src="https://img.shields.io/badge/Join-Community-%23ffcb51?logo=discord&logoColor=black" alt="Join our Community" />
    </a>
    <a href="https://github.com/Guepard-Corp/qwery-core/actions/workflows/build_and_test.yml" target="_blank">
        <img src="https://img.shields.io/github/actions/workflow/status/Guepard-Corp/qwery-core/ci.yml?branch=main" alt="Build">
    </a>
    <a href="https://github.com/Guepard-Corp/qwery-core/blob/main/LICENCE" target="_blank">
        <img src="https://img.shields.io/badge/license-ELv2-blue.svg" alt="License" />
    </a>
    <a href="https://nodejs.org/" target="_blank">
        <img src="https://img.shields.io/badge/node-%3E%3D22.x-brightgreen" alt="Node Version" />
    </a>
    <a href="https://github.com/Guepard-Corp/qwery-core/pulls" target="_blank">
        <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" />
    </a>
    </p>
</div>

## Important Notice

🚧 This project is under active development and not yet suitable for production use. Expect breaking changes, incomplete features, and evolving APIs.

# Qwery Platform - The Vision

Qwery is the most capable platform for querying and visualizing data without requiring any prior technical knowledge in data engineering. Using natural language in any supported language, Qwery seamlessly integrates with hundreds of datasources, automatically generates optimized queries, and delivers outcomes across multiple targets including result sets, dashboards, data apps, reports, and APIs.

### Getting Started

1. **Choose your environment**: Download the desktop application or connect to the [Qwery Cloud Platform](https://app.qwery.run)
2. **Connect your data**: Link to your databases, APIs, or other datasources
3. **Start querying**: Use natural language to query your datasources instantly
4. **Work with AI agents**: Press `CMD/CTRL + L` to collaborate with intelligent agents that assist with your data workflows

## 🌟 Features

- **Natural Language Querying**: Ask questions in plain language, get SQL automatically
- **Multi-Database Support**: PostgreSQL, MySQL, MongoDB, DuckDB, ClickHouse, SQL Server, and more
- **AI-Powered Agents**: Intelligent assistants that help with data workflows (CMD/CTRL + L)
- **Flexible LLM Providers**: Swap between on-device WebLLM and cloud providers (Azure today, OpenAI/Anthropic next) using a single abstraction layer
- **Visual Data Apps**: Build dashboards and data applications without code
- **Desktop & Cloud**: Run locally or use our cloud platform
- **Template Library**: Pre-built notebooks, queries, and dashboards
- **Extensible**: Plugin system for custom datasources and integrations

## 🚀 Quick Start

### Prerequisites

- Node.js >= 22.x
- pnpm >= 10.x

### Installation

```bash
# Clone the repository
git clone https://github.com/Guepard-Corp/qwery-core.git
cd qwery-core

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The web app will be available at `http://localhost:3000`

### Desktop Application

```bash
# Build and run desktop app
pnpm desktop:dev
```

### Command Line Interface

The CLI (located in `apps/cli`) uses the same domain use cases and repository abstractions. It is ideal for headless environments or automation workflows.

```bash
# Build the CLI once (emits dist/index.js with the qwery binary)
pnpm --filter cli build

# Initialize the local workspace snapshot
pnpm --filter cli start -- workspace init

# Inspect projects (uses domain use cases, never repositories directly)
pnpm --filter cli start -- project list

# Create a project without leaving the terminal
pnpm --filter cli start -- project create "Finance Data" \
  --description "Finance notebooks for 2025 planning" \
  --status active

# Register a remote datasource (Postgres in this example)
pnpm --filter cli start -- datasource create "Prod Postgres" \
  --connection "postgresql://user:pass@host:5432/postgres?sslmode=require"

# Build a notebook that targets the datasource
NOTEBOOK_ID=$(pnpm --filter cli start -- notebook create "Remote Analysis" --format json | jq -r '.id')
pnpm --filter cli start -- notebook add-cell "$NOTEBOOK_ID" \
  --type prompt \
  --datasources "<DATASOURCE_ID>" \
  --query "List the schemas and how many tables they hold"

# Execute the cell (natural language -> SQL). Requires Azure/Bredrock env + TLS override if using self-signed certs.
NODE_TLS_REJECT_UNAUTHORIZED=0 pnpm --filter cli start -- notebook run "$NOTEBOOK_ID" \
  --cell 1 \
  --mode natural \
  --datasource "<DATASOURCE_ID>" \
  --update-cell
```

State is stored at `~/.qwery/cli-state.json`, so you can safely run the CLI repeatedly or check it into pipelines. Use `--format json` on any command for machine-friendly output.
If your datasource uses a self-signed certificate, prefix commands with `NODE_TLS_REJECT_UNAUTHORIZED=0` (or set it once in your shell) so the Postgres driver can complete the TLS handshake.
Natural-language execution goes through the same Azure/Bedrock abstraction as the web app, so make sure the relevant `AZURE_*` or `AWS_*` env vars are exported before running `notebook run --mode natural`.

### Agent Provider Configuration

The LangGraph-based agents now share one provider abstraction, so WebLLM (default) and Azure OpenAI sit behind the same transport and ReAct graph. Configure them through env vars:

- **WebLLM (default)** – no extra setup, optionally override `VITE_AGENT_MODEL` and `VITE_AGENT_TEMPERATURE`.
- **Azure OpenAI** – set the following before running the web app or transports:
  ```bash
  # client-side (apps/web) .env
  VITE_AGENT_PROVIDER=azure
  VITE_AZURE_API_KEY=<your_azure_api_key>
  VITE_AZURE_ENDPOINT=https://<your-resource>.openai.azure.com/
  VITE_AZURE_DEPLOYMENT_ID=<deployment_name>
  VITE_AZURE_API_VERSION=2024-04-01-preview

  # optional server-side fallbacks
  AZURE_API_KEY=<your_azure_api_key>
  AZURE_ENDPOINT=https://<your-resource>.openai.azure.com/
  AZURE_DEPLOYMENT_ID=<deployment_name>
  AZURE_API_VERSION=2024-04-01-preview
  ```
Switching providers is as simple as changing `VITE_AGENT_PROVIDER`; the rest of the stack (tools, transports, memory) stays untouched.

## 📚 Documentation

- [Contributing Guide](CONTRIBUTING.md)
- [Pull Request Guide](docs/contribution/pull-request-guide.md)
- [Desktop App Documentation](docs/desktop.md)
- [RFCs](docs/rfcs/)

## 🤝 Contributing

We welcome contributions! Check out our [Contributing Guide](CONTRIBUTING.md) to get started.

- Review [good first issues](https://github.com/Guepard-Corp/qwery-core/issues?q=is%3Aopen+is%3Aissue+label%3A%22good%20first%20issue%22)
- Read our [Code of Conduct](CODE_OF_CONDUCT.md)
- Join our [Discord community](https://discord.gg/nCXAsUd3hm)

## 💬 Join Qwery Community

- **Discord**: [Join our Discord](https://discord.gg/nCXAsUd3hm) for discussions and support
- **GitHub Issues**: Report bugs and request features
- **YouTube**: [Watch demos and tutorials](https://youtu.be/WlOkLnoY2h8?si=hb6-7kLhlOvVL1u6)

## 📄 License

This project uses the Elastic License 2.0 (ELv2). See the [LICENSE](LICENCE) file for details.

## 🙏 Thank You

We're grateful to the open source community. See our [Thank You](THANK-YOU.md) page for acknowledgments.
