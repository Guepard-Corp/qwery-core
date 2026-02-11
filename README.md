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
pnpm server:dev
pnpm web:dev
```

The web app will be available at `http://localhost:3000`

**Using apps/web with apps/server**: To have the web app use the API server (file repositories) instead of in-app API routes, start the server (`pnpm --filter server dev`, port 4096) and set `VITE_API_URL=http://localhost:4096/api` in `apps/web/.env`. Then start the web app (`pnpm --filter web dev`). Flow: Web Browser → SSR/Loader → apps/server Hono.

### Desktop Application

```bash
# Build and run desktop app
pnpm desktop:dev
```

## 🛠️ Development

### Monorepo Structure

This is a Turborepo monorepo with the following structure:

- `apps/web` - Main React Router SaaS application
- `apps/desktop` - Desktop application (Electron)
- `packages/features/*` - Feature packages
- `packages/` - Shared packages and utilities
- `tooling/` - Build tools and development scripts

### Development Commands

```bash
# Start all apps in development mode
pnpm dev

# Start specific app
pnpm --filter server dev     # Server app
pnpm --filter web dev        # Web app (port 3000)
pnpm --filter desktop dev    # Desktop app
pnpm --filter tui dev        # Terminal app

# Code Quality
pnpm format:fix              # Auto-fix formatting
pnpm lint:fix                # Auto-fix linting issues
pnpm typecheck               # Type checking
pnpm check                   # Run all quality checks (format, lint, typecheck, build, test)

# Build
pnpm build                   # Build all packages

# Testing
pnpm test                    # Run all tests
```

### Code Quality Standards

- **TypeScript**: Strict type checking, avoid `any` types
- **Linting**: ESLint with strict rules
- **Formatting**: Prettier with consistent style
- **Testing**: Vitest for unit tests, Playwright for E2E

Always run `pnpm check` before committing to ensure all quality checks pass.

## 📚 Documentation

- [Contributing Guide](CONTRIBUTING.md)
- [Pull Request Guide](docs/contribution/pull-request-guide.md)
- [Desktop App Documentation](docs/desktop.md)
- [RFCs](docs/rfcs/)

## 🤝 Contributing

We welcome contributions! Check out our [Contributing Guide](CONTRIBUTING.md) to get started.

### Before Submitting

1. Run `pnpm check` to ensure all quality checks pass
2. Make sure your code follows our [TypeScript guidelines](AGENTS.md#typescript)
3. Write tests for new features
4. Update documentation as needed

### Resources

- Review [good first issues](https://github.com/Guepard-Corp/qwery-core/issues?q=is%3Aopen+is%3Aissue+label%3A%22good%20first%20issue%22)
- Read our [Code of Conduct](CODE_OF_CONDUCT.md)
- Check [AGENTS.md](AGENTS.md) for development guidelines
- Join our [Discord community](https://discord.gg/nCXAsUd3hm)

## 💬 Join Qwery Community

- **Discord**: [Join our Discord](https://discord.gg/nCXAsUd3hm) for discussions and support
- **GitHub Issues**: Report bugs and request features
- **YouTube**: [Watch demos and tutorials](https://youtu.be/WlOkLnoY2h8?si=hb6-7kLhlOvVL1u6)

## 📄 License

This project uses the Elastic License 2.0 (ELv2). See the [LICENSE](LICENCE) file for details.

## 🙏 Thank You

We're grateful to the open source community. See our [Thank You](THANK-YOU.md) page for acknowledgments.
