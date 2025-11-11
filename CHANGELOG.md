# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial open source release preparation
- Code of Conduct
- Contributing guidelines
- Security policy
- Pull request templates
- Issue templates (Bug Report, Enhancement)

### Changed
- Updated README with comprehensive documentation

### Deprecated

### Removed

### Fixed

### Security

## [0.1.0] - 2025-11-11

### Added
- Initial release of Qwery Core
- React Router 7 web application
- Electron desktop application
- Natural language to SQL query generation
- Multi-database support (PostgreSQL, MySQL, MongoDB, DuckDB, ClickHouse, SQL Server)
- AI-powered agents for data workflows
- Template system for notebooks, queries, and dashboards
- Turborepo monorepo structure
- Core domain packages
- Repository implementations (IndexedDB, Memory)
- Extension SDK for custom datasources
- Datasources feature package
- Notebook feature package
- Playground feature package
- UI component library with Shadcn UI
- Tailwind CSS 4 styling
- TypeScript support across all packages
- Comprehensive test coverage with Vitest
- Storybook for component development

### Known Issues
- Project is under active development and not production-ready
- Breaking changes expected in upcoming releases
- Some features are incomplete

---

## Changelog Guidelines

When adding entries to the changelog:

### Categories
- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Vulnerability fixes

### Format
- Use present tense ("Add feature" not "Added feature")
- Reference PRs and issues when applicable: `(#123)`
- Use emoji prefixes matching PR conventions:
  - 🎉 New Datasource
  - ✨ New Feature
  - 🐛 Bug Fix
  - 📝 Documentation
  - 🚨 Breaking Change

### Example Entry
```markdown
## [1.0.0] - 2025-12-01

### Added
- ✨ New datasource: Snowflake connector (#456)
- Support for custom SQL templates (#457)

### Fixed
- 🐛 PostgreSQL: Connection timeout issues (#458)
```

[Unreleased]: https://github.com/Guepard-Corp/qwery-core/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Guepard-Corp/qwery-core/releases/tag/v0.1.0

