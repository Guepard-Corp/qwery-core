# Telemetry Implementation Guide

## Overview

This document provides a comprehensive guide to the OpenTelemetry-based telemetry implementation in Qwery, covering CLI, Web, Desktop, and Agent instrumentation.

## Table of Contents

1. [Architecture](#architecture)
2. [Current Implementation Status](#current-implementation-status)
3. [CLI Telemetry](#cli-telemetry)
4. [Agent Telemetry](#agent-telemetry)
5. [Web/Desktop Telemetry](#webdesktop-telemetry)
6. [Configuration](#configuration)
7. [Known Limitations](#known-limitations)

---

## Architecture

### Core Components

**Location:** `/apps/telemetry/*`

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
   - `cli.events.ts` - CLI event constants and schemas
   - `web.events.ts` - Web event constants and schemas
   - `desktop.events.ts` - Desktop event constants and schemas
   - `agent.events.ts` - Agent event constants and schemas

4. **React Context** (`src/telemetry.context.tsx`)
   - `TelemetryProvider` - React context provider
   - `useTelemetry()` - React hook
   - `withTelemetryContext()` - HOC

5. **Services**
   - `ClientTelemetryService` - Client-side service
   - `NullTelemetryService` - No-op service for testing/opt-out

### Span Hierarchy

```
CLI command span (optional, if called from CLI)
 └─ Agent conversation span (per respond() call)
      └─ Message span (per USER_INPUT)
           └─ Actor spans (detectIntent, summarizeIntent, greeting, readData, loadContext)
                └─ LLM spans (in model providers)
                     └─ DB spans (optional, in repositories)
```

**Note:** Due to XState's async actor invocation, perfect span nesting may not be achieved. Spans are still created with correct attributes and can be correlated via `agent.conversation.id`.

---

## Current Implementation Status

### ✅ Completed

#### Core Telemetry
- ✅ OpenTelemetry SDK initialization
- ✅ Console and OTLP exporters
- ✅ Metrics support (counters, histograms)
- ✅ Session management
- ✅ Attribute serialization
- ✅ Event capture

#### CLI Telemetry
- ✅ All commands instrumented (`project`, `datasource`, `workspace`, `notebook`)
- ✅ `withCommandSpan()` utility
- ✅ Command metrics (duration, count, success, error)
- ✅ Query metrics (duration, count, rows returned)
- ✅ Token usage metrics
- ✅ Interactive mode support

#### Agent Telemetry
- ✅ Conversation spans in `FactoryAgent.respond()`
- ✅ Message spans per user input
- ✅ Actor spans for all XState actors:
  - `detectIntentActor`
  - `summarizeIntentActor`
  - `greetingActor`
  - `readDataAgentActor`
  - `loadContextActor`
- ✅ LLM spans in model providers (WebLLM, Azure, Ollama)
- ✅ Token usage capture
- ✅ Event capture (conversation, message, actor, LLM lifecycle)

#### Event Definitions
- ✅ CLI events (`cli.events.ts`)
- ✅ Web events (`web.events.ts`)
- ✅ Desktop events (`desktop.events.ts`)
- ✅ Agent events (`agent.events.ts`)

#### React Context
- ✅ `TelemetryProvider` component
- ✅ `useTelemetry()` hook
- ✅ `withTelemetryContext()` HOC

### ⚠️ Known Limitations

#### XState Context Propagation

**Issue:** XState's `fromPromise` actors are invoked asynchronously, and OpenTelemetry context is not always preserved through these async boundaries.

**Impact:**
- Spans may have different `traceId` values
- `parentSpanContext` may be `undefined`
- Spans cannot nest perfectly automatically

**Workaround:**
- All spans include `agent.conversation.id` for correlation
- Spans are still created with correct attributes
- Events are captured correctly
- Token usage is tracked
- Telemetry is still valuable for debugging and monitoring

**Status:** This is a known limitation when mixing OpenTelemetry with certain async frameworks. The telemetry is still functional and useful.

---

## CLI Telemetry

### Implementation

All CLI commands are instrumented using the `withCommandSpan()` utility:

```typescript
import { withCommandSpan } from '../utils/telemetry-utils';

await withCommandSpan(
  container.telemetry,
  container,
  'project.list',
  options,
  'command', // or 'interactive'
  async (span) => {
    // Command logic
    return result;
  },
);
```

### Instrumented Commands

- ✅ `project list` - Query metrics
- ✅ `project create` - Creation milestones
- ✅ `project delete` - Deletion tracking
- ✅ `datasource create` - Connection test metrics
- ✅ `datasource list` - Query metrics
- ✅ `datasource test` - Connection latency
- ✅ `workspace init` - Initialization tracking
- ✅ `workspace show` - Read operations
- ✅ `notebook create` - Creation tracking
- ✅ `notebook list` - Query metrics
- ✅ `notebook add-cell` - Cell addition tracking
- ✅ `notebook run` - Execution metrics

### Metrics

- `cli.command.duration` (histogram, ms)
- `cli.command.count` (counter)
- `cli.command.success.count` (counter)
- `cli.command.error.count` (counter)
- `cli.query.duration` (histogram, ms)
- `cli.query.count` (counter)
- `cli.query.rows.returned` (histogram)
- `cli.ai.tokens.prompt` (counter)
- `cli.ai.tokens.completion` (counter)
- `cli.ai.tokens.total` (counter)

### Events

See `src/events/cli.events.ts` for complete event definitions.

---

## Agent Telemetry

### Implementation

Agent telemetry is integrated into the `FactoryAgent` and XState state machine:

1. **Conversation Span** - Created in `FactoryAgent.respond()`
2. **Message Span** - Created per user input
3. **Actor Spans** - Created in XState actor wrappers
4. **LLM Spans** - Created in model providers

### Files Modified

- `packages/agent-factory-sdk/src/agents/factory-agent.ts`
  - Conversation and message spans
  - Context propagation setup

- `packages/agent-factory-sdk/src/agents/state-machine.ts`
  - Actor span wrappers
  - Context propagation attempts

- `packages/agent-factory-sdk/src/services/webllm-model.provider.ts`
  - LLM spans
  - Token usage capture

### Events

See `src/events/agent.events.ts` for complete event definitions:

- `CONVERSATION_STARTED`, `CONVERSATION_COMPLETED`, `CONVERSATION_ERROR`
- `MESSAGE_RECEIVED`, `MESSAGE_PROCESSED`, `MESSAGE_ERROR`
- `ACTOR_INVOKED`, `ACTOR_COMPLETED`, `ACTOR_FAILED`
- `LLM_CALL_STARTED`, `LLM_CALL_COMPLETED`, `LLM_CALL_ERROR`

### Token Usage

Token usage is captured:
- **WebLLM**: Synchronously in provider's `doGenerate` method
- **Azure/Ollama**: Asynchronously from `streamText.usage` promise

---

## Web/Desktop Telemetry

### React Context Usage

```typescript
import { TelemetryProvider, useTelemetry, WEB_EVENTS } from '@qwery/telemetry-opentelemetry';

function App() {
  return (
    <TelemetryProvider telemetry={telemetry}>
      <MyComponent />
    </TelemetryProvider>
  );
}

function MyComponent() {
  const { telemetry } = useTelemetry();
  
  const handleClick = () => {
    telemetry.captureEvent({
      name: WEB_EVENTS.UI_BUTTON_CLICK,
      attributes: { 'web.ui.element': 'submit-button' },
    });
  };
}
```

### Generic Action Wrapper

```typescript
import { withActionSpan } from '@qwery/telemetry-opentelemetry/telemetry-utils';

await withActionSpan(
  telemetry,
  {
    actionName: 'notebook.create',
    appType: 'web', // or 'desktop'
    mode: 'browser', // or 'electron'
    workspace: {
      userId: workspace.userId,
      projectId: workspace.projectId,
    },
  },
  async (span) => {
    // Action logic
    return result;
  },
);
```

---

## Configuration

### Environment Variables

```bash
# OTLP Exporter Endpoint (optional)
# If set, traces/metrics will be exported to this endpoint
# If not set, uses ConsoleSpanExporter (prints to console)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces

# Service Name (optional)
OTEL_SERVICE_NAME=qwery-app

# Log Level (optional)
OTEL_LOG_LEVEL=info
```

### CLI Integration

Telemetry is automatically initialized in `CliContainer`:

```typescript
const sessionId = `cli-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
this.telemetry = new TelemetryManager('qwery-cli', sessionId);
await this.telemetry.init();
```

### Agent Integration

Telemetry is passed to `FactoryAgent`:

```typescript
const agent = new FactoryAgent({
  conversationSlug,
  repositories,
  telemetry: container.telemetry, // Pass telemetry instance
});
```

---

## Known Limitations

### XState Context Propagation

**Problem:** XState's async actor invocation doesn't preserve OpenTelemetry context.

**Impact:**
- Spans may have different `traceId` values
- `parentSpanContext` may be `undefined`
- Perfect span nesting is not achieved

**Mitigation:**
- All spans include `agent.conversation.id` for correlation
- Spans have correct attributes
- Events are captured
- Token usage is tracked
- Telemetry is still valuable

**Status:** Known limitation, documented for future reference.

---

## Next Steps

1. **Web Integration** - Use `TelemetryProvider` in web app
2. **Desktop Integration** - Use `TelemetryProvider` in desktop app
3. **Metrics Dashboard** - Set up Grafana/Prometheus dashboards
4. **Span Links** - Explore using span links to connect related spans (future enhancement)

---

## References

- OpenTelemetry JS: https://opentelemetry.io/docs/js/
- XState Documentation: https://xstate.js.org/docs/
- Package Structure: [STRUCTURE.md](./STRUCTURE.md)
- Usage Examples: [EXAMPLES.md](./EXAMPLES.md)
