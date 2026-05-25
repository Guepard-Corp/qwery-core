![Guepard](/resources/guepard-cover.png)

<div align="center">
    <h1>Qwery: the AI data agent in your terminal</h1>
    <br />
    <p align="center">
    <a href="https://youtu.be/WlOkLnoY2h8?si=hb6-7kLhlOvVL1u6">
        <img src="https://img.shields.io/badge/Watch-YouTube-%23ffcb51?logo=youtube&logoColor=black" alt="Watch on YouTube" />
    </a>
    <a href="https://discord.gg/nCXAsUd3hm">
        <img src="https://img.shields.io/badge/Join-Community-%23ffcb51?logo=discord&logoColor=black" alt="Join our Community" />
    </a>
    <a href="https://github.com/Guepard-Corp/qwery-core/actions/workflows/ci.yml" target="_blank">
        <img src="https://img.shields.io/github/actions/workflow/status/Guepard-Corp/qwery-core/ci.yml?branch=main" alt="Build">
    </a>
    <a href="https://github.com/Guepard-Corp/qwery-core/blob/main/LICENCE" target="_blank">
        <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" />
    </a>
    <a href="https://bun.sh/" target="_blank">
        <img src="https://img.shields.io/badge/bun-%3E%3D1.3-brightgreen" alt="Bun Version" />
    </a>
    <a href="https://github.com/Guepard-Corp/qwery-core/pulls" target="_blank">
        <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" />
    </a>
    </p>
</div>

## Important Notice

🚧 This project is under active development and not yet suitable for production use. Expect breaking changes, incomplete features, and evolving APIs.

# Qwery: The Vision

Qwery is an AI data analyst that lives in your terminal. Ask questions in plain language; Qwery connects to your datasources, generates the SQL, runs it locally, and answers, without you ever leaving the keyboard.

It pairs two agents (a **DataAgent** for analysis and a **CodingAgent** for building scripts and apps) behind a single TUI.

### Privacy by design

Row-level data never leaves your machine and is never sent to the LLM. Queries run in a local query engine; the model only ever sees schemas, aggregate scalars, and locally-rendered output. Destructive operations are protected by [GFS](https://github.com/Guepard-Corp/gfs) ("git for databases"): the agent can branch and snapshot a database before touching it.

## 🌟 Features

- **Natural-language querying**: ask in plain language, get SQL automatically.
- **Privacy-preserving**: a local query engine keeps row data on your machine; only schemas/aggregates reach the LLM.
- **Two agents**: a DataAgent (analysis) and a CodingAgent (build/edit scripts and apps).
- **GFS safety net**: branch/commit/time-travel a database before destructive operations.
- **Many datasources via extensions**: PostgreSQL, MySQL, ClickHouse, DuckDB, CSV (local & online), Parquet, JSON, Google Sheets, S3, Excel (.xlsx).
- **Bring your own model**: configure any provider in-app via `/models` (Ollama local & cloud, Azure OpenAI, AWS Bedrock, and any OpenAI-compatible endpoint).
- **Extensible**: an extension SDK for custom datasources.

## 🚀 Quick Start

### Install (recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/Guepard-Corp/qwery-core/main/install | bash
```

This installs `qwery` (and the GFS engine) under `~/.qwery` and adds it to your `PATH`. Then just run:

```bash
qwery
```

Once in the TUI, press `/models` to connect a provider. No API keys live in environment variables; provider configuration is stored under `~/.qwery`.

> **Try it for free with Ollama:** install [Ollama](https://ollama.com), pull a tool-capable model (e.g. `ollama pull qwen3-coder:30b`), then in `/models` pick **Ollama (local)** and point it at `http://localhost:11434/v1`.

### Run from source

Prerequisites: [Bun](https://bun.sh) >= 1.3.

```bash
git clone https://github.com/Guepard-Corp/qwery-core.git
cd qwery-core
bun install
bun start        # launch the TUI (use `bun dev` for --watch)
```

## 🛠️ Development

### Monorepo structure

A Bun + Turborepo monorepo with a hexagonal architecture (see [AGENTS.md](AGENTS.md)):

- `apps/cli`: the Ink TUI (primary adapter)
- `apps/e2e`: end-to-end tests driving the real TUI
- `evals/`: real-model evaluation suite (NL→SQL correctness, etc.)
- `packages/domain`: entities, value objects, and ports (no I/O)
- `packages/application`: use cases orchestrating the domain
- `packages/agent-factory-sdk`: the agent loop, tools, and compaction
- `packages/adapters/*`: `compute-duckdb`, `llm-aisdk`, `persistence-sqlite`, `model-catalog-http`, `branching-gfs`, `semantic-inprocess`
- `packages/extension-sdk` + `packages/extensions/*`: datasource extensions
- `tooling/`: dependency-cruiser, privacy and coverage checks

### Commands

```bash
bun start                 # launch the TUI
bun dev                   # launch with --watch

bun run lint              # Biome lint + format check (bun run lint:fix to apply)
bun run typecheck         # tsc -b
bun test                  # unit + component tests (bun:test)
bun run check:arch        # hexagonal boundaries (dependency-cruiser)
bun run check:privacy     # privacy invariant (no row data crosses the LLM line)
bun run coverage          # test coverage + ADR #16 tiered gate
bun run check:all         # lint + typecheck + arch + privacy + coverage

cd apps/e2e && bun test   # TUI end-to-end tests
cd evals && bun run evals # real-model evals (defaults to a local Ollama; skips if none)
```

### Code quality standards

- **TypeScript**: strict typing, no `any`.
- **Lint & format**: [Biome](https://biomejs.dev).
- **Architecture**: hexagonal boundaries enforced by `dependency-cruiser`.
- **Tests**: `bun:test` for unit/component, `apps/e2e` for end-to-end, `evals/` for real-model checks.

Run `bun run check:all` before committing.

## 📚 Documentation

- [Contributing Guide](CONTRIBUTING.md)
- [Agent & contributor guidelines](AGENTS.md)
- [E2E test plan](apps/e2e/PLAN.md)

## 🤝 Contributing

We welcome contributions! Check out our [Contributing Guide](CONTRIBUTING.md) to get started.

### Before submitting

1. Run `bun run check:all` to ensure all quality checks pass.
2. Follow our [TypeScript guidelines](AGENTS.md).
3. Write tests for new features (a change without tests is incomplete).
4. Update documentation as needed.

### Resources

- Review [good first issues](https://github.com/Guepard-Corp/qwery-core/issues?q=is%3Aopen+is%3Aissue+label%3A%22good%20first%20issue%22)
- Read our [Code of Conduct](CODE_OF_CONDUCT.md)
- Check [AGENTS.md](AGENTS.md) for development guidelines
- Join our [Discord community](https://discord.gg/nCXAsUd3hm)

## 💬 Join the Qwery Community

- **Discord**: [Join our Discord](https://discord.gg/nCXAsUd3hm) for discussions and support
- **GitHub Issues**: Report bugs and request features
- **YouTube**: [Watch demos and tutorials](https://youtu.be/WlOkLnoY2h8?si=hb6-7kLhlOvVL1u6)

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENCE) file for details.

## 🙏 Thank You

We're grateful to the open source community. See our [Thank You](THANK-YOU.md) page for acknowledgments.
