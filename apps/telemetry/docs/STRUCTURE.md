# Telemetry Package Structure Guide

This document explains the structure of the telemetry package and where to add functionality.

## Directory Structure

```
apps/telemetry/
├── src/
│   ├── telemetry-manager.ts          # Core OpenTelemetry SDK manager
│   ├── telemetry-utils.ts             # Generic utilities (CLI/web/desktop)
│   ├── telemetry.context.tsx          # React context for web/desktop
│   ├── client.telemetry.service.ts    # Client-side telemetry service
│   ├── null-telemetry-service.ts      # No-op service for testing/opt-out
│   ├── index.ts                       # Main package exports
│   ├── events/
│   │   ├── cli.events.ts              # CLI event schemas/types
│   │   ├── web.events.ts              # Web event schemas/types
│   │   ├── desktop.events.ts          # Desktop event schemas/types
│   │   └── agent.events.ts           # Agent event schemas/types
│   └── hooks/
│       └── types.ts                   # React hook type definitions
├── docs/
│   ├── STRUCTURE.md                   # This file
│   ├── IMPLEMENTATION.md              # Comprehensive implementation guide
│   ├── EXAMPLES.md                    # Usage examples for all apps
│   └── NO_TELEMETRY.md               # How to disable telemetry
├── TELEMETRY.md                       # Overview & concepts
├── README.md                          # Package documentation
├── .env.example                       # Environment variables example
└── package.json                       # Package configuration
```

## Where to Add Functionality

### Core Telemetry Logic

**`src/telemetry-manager.ts`**
- Main OpenTelemetry SDK initialization
- Span creation and management
- Metrics instruments (counters, histograms)
- Session management
- Resource attributes
- Exporter configuration

**When to modify:**
- Adding new metrics
- Changing SDK configuration
- Adding resource attributes
- Modifying exporter logic

### Generic Utilities

**`src/telemetry-utils.ts`**
- `withActionSpan()` - Generic action wrapper (works for all apps)
- `recordQueryMetrics()` - Query execution metrics
- `recordTokenUsage()` - AI token usage metrics
- `createActionAttributes()` - Standardized attribute creation
- `parseActionName()` - Action name parsing

**When to modify:**
- Adding new utility functions
- Changing attribute schemas
- Adding cross-app functionality

### App-Specific Event Schemas

**`src/events/cli.events.ts`**
- CLI-specific event types
- CLI event schemas
- CLI event constants

**`src/events/web.events.ts`**
- Web-specific event types
- Web event schemas
- Web event constants

**`src/events/desktop.events.ts`**
- Desktop-specific event types
- Desktop event schemas
- Desktop event constants

**When to modify:**
- Adding new event types for a specific app
- Defining event schemas
- Adding event constants

### React Hooks (Web/Desktop)

**`src/hooks/types.ts`**
- Type definitions for React hooks
- Hook interfaces

**When to modify:**
- Adding new hook types
- Modifying hook interfaces

**Note:** Hook implementations are in `src/telemetry.context.tsx`.

### Services

**`src/client.telemetry.service.ts`**
- Client-side telemetry service implementation
- Browser/desktop client logic

**`src/null-telemetry-service.ts`**
- No-op implementation for testing
- Opt-out telemetry

**Note:** Server telemetry service is not needed as this is a backendless application. All telemetry is client-side.

**When to modify:**
- Adding service-specific logic
- Implementing new service methods

## App-Specific Wrappers

While the core utilities in `src/telemetry-utils.ts` are generic, each app should have its own wrapper for convenience:

### CLI Wrappers
**Location:** `apps/cli/src/utils/telemetry-utils.ts`
- `withCommandSpan()` - CLI-specific wrapper
- `getWorkspaceContext()` - Extracts workspace from CliContainer
- CLI-specific helpers

### Web Wrappers (To Be Created)
**Location:** `apps/web/lib/telemetry/` or `apps/web/components/`
- React hooks for telemetry
- Web-specific action wrappers
- Browser context extraction

### Desktop Wrappers (To Be Created)
**Location:** `apps/desktop/src/telemetry/` or similar
- Desktop-specific action wrappers
- Electron context extraction
- Desktop-specific helpers

## Adding New Functionality

### Adding a New Metric

1. **Add metric instrument** in `src/telemetry-manager.ts`:
   ```typescript
   private myNewMetric: Counter;
   
   private initializeMetrics(): void {
     this.myNewMetric = this.meter.createCounter('my.metric.name', {
       description: 'My metric description',
     });
   }
   ```

2. **Add recording method** in `src/telemetry-manager.ts`:
   ```typescript
   recordMyMetric(value: number, attributes?: Record<string, string | number | boolean>): void {
     this.myNewMetric.add(value, attributes);
   }
   ```

3. **Use in utilities** if needed in `src/telemetry-utils.ts`

### Adding a New Event Type

1. **Define event schema** in appropriate event file:
   - `src/events/cli.events.ts` for CLI
   - `src/events/web.events.ts` for web
   - `src/events/desktop.events.ts` for desktop

2. **Use in code**:
   ```typescript
   telemetry.captureEvent({
     name: 'my.event.name',
     attributes: { /* ... */ },
   });
   ```

### Adding a New Utility Function

1. **Add to `src/telemetry-utils.ts`** if it's generic (works for all apps)
2. **Add to app-specific wrapper** if it's app-specific:
   - CLI: `apps/cli/src/utils/telemetry-utils.ts`
   - Web: (to be created)
   - Desktop: (to be created)

## Best Practices

1. **Keep generic utilities generic**: Don't add app-specific logic to `src/telemetry-utils.ts`
2. **Use app-specific wrappers**: Create convenient wrappers in each app
3. **Follow naming conventions**: 
   - CLI: `cli.command.*`, `cli.action.*`
   - Web: `web.action.*`, `web.ui.*`
   - Desktop: `desktop.action.*`, `desktop.ui.*`
4. **Document event schemas**: Add JSDoc comments to event definitions
5. **Test utilities**: Add tests for new utilities
6. **Update documentation**: Update relevant docs when adding functionality

## Related Documentation

- **[README.md](../README.md)** - Package overview and usage
- **[IMPLEMENTATION.md](./IMPLEMENTATION.md)** - Comprehensive implementation guide
- **[EXAMPLES.md](./EXAMPLES.md)** - Usage examples for all apps
- **[NO_TELEMETRY.md](./NO_TELEMETRY.md)** - How to disable telemetry

