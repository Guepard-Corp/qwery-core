# OpenTelemetry Telemetry Package

This package provides OpenTelemetry-based telemetry for **CLI, Web, Desktop, and Agent** applications in the Qwery monorepo.

## 📚 Documentation

- **[docs/IMPLEMENTATION.md](./docs/IMPLEMENTATION.md)** - Comprehensive implementation guide
- **[docs/EXAMPLES.md](./docs/EXAMPLES.md)** - Usage examples for all apps
- **[docs/STRUCTURE.md](./docs/STRUCTURE.md)** - Package structure guide
- **[docs/NO_TELEMETRY.md](./docs/NO_TELEMETRY.md)** - How to disable telemetry

## Quick Start

### CLI

```typescript
import { withCommandSpan } from '../utils/telemetry-utils';

await withCommandSpan(
  container.telemetry,
  container,
  'project.list',
  options,
  'command',
  async (span) => {
    // Command logic
    return result;
  },
);
```

### Web/Desktop (React)

```typescript
import { TelemetryProvider, useTelemetry } from '@qwery/telemetry-opentelemetry';

function App() {
  return (
    <TelemetryProvider telemetry={telemetry}>
      <MyComponent />
    </TelemetryProvider>
  );
}

function MyComponent() {
  const { telemetry } = useTelemetry();
  // Use telemetry...
}
```

### Agent

```typescript
const agent = new FactoryAgent({
  conversationSlug,
  repositories,
  telemetry: container.telemetry, // Pass telemetry instance
});
// Telemetry is automatically instrumented
```

## Location

All telemetry code is in `/apps/telemetry` and is reusable across:
- **CLI** (`apps/cli`)
- **Web** (`apps/web`)
- **Desktop** (`apps/desktop`)
- **Agent** (`packages/agent-factory-sdk`)

## Architecture

### Core Components

1. **TelemetryManager** (`src/telemetry-manager.ts`)
   - Main OpenTelemetry SDK manager
   - Handles spans, metrics, and events
   - Supports ConsoleSpanExporter (default) and OTLP exporters
   - Session management
   - Automatic attribute serialization

2. **Telemetry Utilities** (`src/telemetry-utils.ts`)
   - Generic utilities for all app types
   - `withActionSpan()` - Wraps actions with telemetry
   - `recordQueryMetrics()` - Records query execution metrics
   - `recordTokenUsage()` - Records AI token usage

3. **Event Schemas** (`src/events/`)
   - `cli.events.ts` - CLI event constants
   - `web.events.ts` - Web event constants
   - `desktop.events.ts` - Desktop event constants
   - `agent.events.ts` - Agent event constants

4. **React Context** (`src/telemetry.context.tsx`)
   - `TelemetryProvider` - React context provider
   - `useTelemetry()` - React hook

## Current Status

### ✅ Implemented

- ✅ **CLI Telemetry** - All commands instrumented
- ✅ **Agent Telemetry** - FactoryAgent and XState actors instrumented
- ✅ **LLM Telemetry** - Token usage and spans in model providers
- ✅ **Metrics** - Command duration, counts, token usage, query metrics
- ✅ **Events** - Comprehensive event schemas for all apps
- ✅ **React Context** - TelemetryProvider and hooks for web/desktop

### ⚠️ Known Limitations

**XState Context Propagation:** Due to XState's async actor invocation, perfect span nesting may not be achieved. Spans are still created with correct attributes and can be correlated via `agent.conversation.id`. See [IMPLEMENTATION.md](./docs/IMPLEMENTATION.md) for details.

## Metrics

### Command/Action Metrics
- `cli.command.duration` (histogram, ms)
- `cli.command.count` (counter)
- `cli.command.success.count` (counter)
- `cli.command.error.count` (counter)

### Query Metrics
- `query.duration` (histogram, ms)
- `query.count` (counter)
- `query.rows.returned` (histogram)

### Token Usage
- `ai.tokens.prompt` (counter)
- `ai.tokens.completion` (counter)
- `ai.tokens.total` (counter)

## Configuration

### Environment Variables

```bash
# OTLP Exporter Endpoint (optional)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces

# Service Name (optional)
OTEL_SERVICE_NAME=qwery-app

# Log Level (optional)
OTEL_LOG_LEVEL=info
```

## Exports

```typescript
// Main exports
export { TelemetryManager } from './telemetry-manager';
export { ClientTelemetryService } from './client.telemetry.service';
export { NullTelemetryService } from './null-telemetry-service';

// React context
export { TelemetryProvider, useTelemetry, withTelemetryContext } from './telemetry.context';

// Utilities
export {
  withActionSpan,
  createActionAttributes,
  parseActionName,
  recordQueryMetrics,
  recordTokenUsage,
  type ActionContext,
  type WorkspaceContext,
} from './telemetry-utils';

// Event constants
export { CLI_EVENTS } from './events/cli.events';
export { WEB_EVENTS } from './events/web.events';
export { DESKTOP_EVENTS } from './events/desktop.events';
export { AGENT_EVENTS } from './events/agent.events';
```

## File Structure

```
apps/telemetry/
├── src/
│   ├── telemetry-manager.ts      # Main OpenTelemetry manager
│   ├── telemetry-utils.ts         # Generic utilities
│   ├── telemetry.context.tsx      # React context
│   ├── client.telemetry.service.ts
│   ├── null-telemetry-service.ts
│   ├── index.ts                   # Package exports
│   ├── events/
│   │   ├── cli.events.ts
│   │   ├── web.events.ts
│   │   ├── desktop.events.ts
│   │   └── agent.events.ts
│   └── hooks/
│       └── types.ts
├── docs/
│   ├── IMPLEMENTATION.md          # Implementation guide
│   ├── EXAMPLES.md                # Usage examples
│   ├── STRUCTURE.md               # Package structure
│   └── NO_TELEMETRY.md           # Disable telemetry guide
├── .env.example
├── README.md                      # This file
└── package.json
```

**Note:** This is a backendless application, so server-side telemetry is not needed. All telemetry is handled client-side (CLI, web, desktop).

## Next Steps

1. **Web Integration** - Use `TelemetryProvider` in web app
2. **Desktop Integration** - Use `TelemetryProvider` in desktop app
3. **Metrics Dashboard** - Set up Grafana/Prometheus dashboards
4. **Span Links** - Explore using span links for XState actors (future enhancement)
