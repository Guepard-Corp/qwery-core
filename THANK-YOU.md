# Qwery's Thank You Page

Qwery would not be possible without the support and assistance of other open-source tools and communities who believe in giving back to the OSS ecosystem. On this page, we want to recognize the most important open-source technologies that power our stack.

## Agentic AI Technologies

**Vercel AI SDK**

A unified TypeScript toolkit for LLMs (streaming, tool calling, and provider abstraction) powering our agent loop and query generation.

https://sdk.vercel.ai

**Ollama**

Run open models locally with a single command. Our default backend for local development and for the evaluation suite.

https://ollama.com

## Core Technologies

**Bun**

A fast all-in-one JavaScript runtime, bundler, package manager, and test runner. It also ships `bun:sqlite`, which backs our local persistence.

https://bun.sh

**Ink**

React for interactive command-line apps: the foundation of our terminal UI.

https://github.com/vadimdemedes/ink

**React**

A JavaScript library for building user interfaces with a component-based, declarative model: the component layer behind Ink.

https://react.dev

**TypeScript**

A strongly typed programming language that builds on JavaScript, giving us better tooling at any scale.

https://www.typescriptlang.org

**DuckDB**

A fast in-process analytical SQL engine: one of the local query engines we run so data stays on your machine.

https://duckdb.org

**GFS: Git For database Systems**

Git-like version control for databases (branch, commit, time-travel). It is the safety net that lets the agent experiment on data without fear.

https://github.com/Guepard-Corp/gfs

**Zod**

TypeScript-first schema declaration and validation, used across our domain and tool boundaries.

https://zod.dev

**Mustache**

Logic-less templates, used to render query results locally without ever sending row data upstream.

https://mustache.github.io

## Build & Development Tools

**Turborepo**

High-performance build system for JavaScript and TypeScript monorepos, helping us scale our development workflow.

https://turbo.build

**Biome**

A fast formatter and linter for JavaScript and TypeScript, keeping our codebase consistent.

https://biomejs.dev

**dependency-cruiser**

Validates and visualizes our dependency graph, enforcing the boundaries of our hexagonal architecture.

https://github.com/sverweij/dependency-cruiser

**Docker**

Docker enables developers to package and deploy applications inside containers; GFS uses it to provision throwaway database instances.

https://www.docker.com

## Community & Collaboration

**Discord**

Discord provides us with a vibrant community platform where data professionals collaborate and share knowledge.

https://discord.com

**GitHub**

The platform that hosts our code, manages our issues, and enables collaboration from contributors worldwide.

https://github.com

---

We are grateful to the maintainers and contributors of these projects for their tireless work in building and maintaining these incredible tools. The open-source community makes projects like Qwery possible. ❤️
