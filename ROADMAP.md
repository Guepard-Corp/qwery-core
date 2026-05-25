# Qwery Platform Roadmap

This roadmap outlines the planned features and milestones for Qwery. Dates and features are subject to change based on community feedback and priorities.

---

## Shipped & in progress

For released versions and current development, see the [Changelog](CHANGELOG.md).

---

## Upcoming Releases

### 🚧 v0.2.0 - Agentic TUI

**Status:** Current

The terminal-first rebuild that exists today: a dual-agent data analyst in your terminal.

**Key Features:**
- Dual-agent TUI (DataAgent + CodingAgent) on Bun and Ink
- Privacy-safe local query pipeline (schema, runQuery, present); row data never reaches the LLM
- Datasource extensions: PostgreSQL, MySQL, ClickHouse, DuckDB, CSV (local and online), Parquet, JSON, Google Sheets, S3, Excel
- Bring your own model via `/models` (Ollama, Azure OpenAI, AWS Bedrock, any OpenAI-compatible endpoint)
- GFS database-branching foundation
- Install script and per-platform release tarballs

### 🚧 v0.3.0 - Confidentiality & Correctness

**Status:** Next

Make the agent trustworthy: provably private, measurably correct.

**Key Features:**
- Eval suite gating prompt / model / tool changes on NL→SQL correctness, tool selection, and a privacy-never-leak invariant (pass-rate thresholds)
- Hardened privacy boundary enforcement (extended `privacy-check`, audited tool surface)
- Semantic / ontology validation tied to eval-measured accuracy
- Coverage gates (ADR #16) wired into CI
- Cold-start and onboarding polish

### 📋 v0.4.0 - Guepard Data Platform Integration

**Status:** Planned

Connect local work to the Guepard cloud.

**Key Features:**
- Push and pull GFS branches to guepard.run from the agent
- Managed database branching and environment management (dev, staging, prod)
- Remote, shareable workspaces
- Agent experiments on production-like data without touching production

### 📋 v0.5.0 - More Datasources & External Integrations

**Status:** Planned

Broaden reach once the core is trustworthy.

**Key Features:**
- Additional datasource extensions (Snowflake, BigQuery, SQLite, MongoDB, generic REST API)
- MCP support (stdio, SSE, HTTP) for external tools and integrations (Notion, Slack, GitHub, Linear)
- Third-party extension discovery and loading (`@qwery/extension-*` via npm)

---

## Future Considerations

Beyond v0.5, we're exploring:

- **More AI agent capabilities**: data pipeline design, multi-agent orchestration
- **Scheduling**: automated query execution and reporting
- **Alerting**: data-driven alerts and notifications
- **Programmatic access**: an API / SDK for embedding Qwery in your own tools
- **More datasources**: support for thousands of sources

---

## How to Influence the Roadmap

We value community input! Here's how you can help shape Qwery's future:

1. **💬 Join the Discussion**: Share feedback on [GitHub Discussions](https://github.com/Guepard-Corp/qwery-core/discussions)
2. **🎯 Vote on Features**: Upvote features on [GitHub Issues](https://github.com/Guepard-Corp/qwery-core/issues)
3. **🐛 Report Bugs**: Help us improve by reporting issues
4. **✨ Request Features**: Submit feature requests with use cases
5. **🤝 Contribute**: Submit PRs for features you'd like to see
6. **💬 Chat with Us**: Join our [Discord community](https://discord.gg/nCXAsUd3hm)

---

## Legend

- ✅ Released
- 🚧 In Development
- 📋 Planned
- 🎯 Future

---

**Note:** This roadmap is a living document and will be updated regularly. Timelines are estimates and may change based on complexity, resources, and community priorities.

**Last Updated:** May 24, 2026
