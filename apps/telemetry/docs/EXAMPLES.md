# Telemetry Usage Examples

This document provides comprehensive examples for using telemetry in CLI, Web, Desktop, and Agent contexts.

## Table of Contents

1. [CLI Examples](#cli-examples)
2. [Agent Examples](#agent-examples)
3. [Web Examples](#web-examples)
4. [Desktop Examples](#desktop-examples)
5. [Common Patterns](#common-patterns)

---

## CLI Examples

### Basic Command Instrumentation

```typescript
import { withCommandSpan } from '../utils/telemetry-utils';

project
  .command('list')
  .option('-f, --format <format>', 'Output format')
  .action(async (options: ProjectListOptions) => {
    await withCommandSpan(
      container.telemetry,
      container,
      'project.list',
      options,
      'command',
      async (span) => {
        const useCases = container.getUseCases();
        const projects = await useCases.getProjects.execute();
        
        // Format and output
        printOutput(projects, options.format);
        
        return { count: projects.length };
      },
    );
  });
```

### Command with Validation Milestones

```typescript
project
  .command('create <name>')
  .requiredOption('-d, --description <description>', 'Description')
  .action(async (name: string, options: ProjectCreateOptions) => {
    await withCommandSpan(
      container.telemetry,
      container,
      'project.create',
      { name, ...options },
      'command',
      async (span) => {
        // Record validation milestone
        container.telemetry.captureEvent({
          name: CLI_EVENTS.COMMAND_VALIDATED,
        });

        const workspace = container.getWorkspace();
        const organizationId = options.organizationId ?? workspace?.organizationId;

        if (!organizationId) {
          container.telemetry.captureEvent({
            name: CLI_EVENTS.COMMAND_ERROR,
            attributes: {
              'error.type': 'validation_error',
              'error.message': 'Organization id missing',
            },
          });
          throw new CliUsageError('Organization id missing');
        }

        // Record creation milestone
        container.telemetry.captureEvent({
          name: CLI_EVENTS.COMMAND_CREATING,
          attributes: {
            'cli.project.name': name,
            'cli.project.organization_id': organizationId,
          },
        });

        const project = await useCases.createProject.execute({
          name,
          description: options.description,
          organizationId,
        });
        
        container.telemetry.captureEvent({
          name: CLI_EVENTS.COMMAND_CREATED,
          attributes: {
            'cli.project.id': project.id,
            'cli.project.slug': project.slug,
          },
        });

        return project;
      },
    );
  });
```

### Recording Token Usage

```typescript
import { recordTokenUsage } from '../utils/telemetry-utils';

// After AI agent invocation
const response = await agent.respond({ messages });

if (response.usage) {
  recordTokenUsage(
    container.telemetry,
    container,
    response.usage.promptTokens,
    response.usage.completionTokens,
    {
      'ai.model': 'gpt-4',
      'ai.provider': 'azure',
    },
  );
}
```

### Recording Query Metrics

```typescript
import { recordQueryMetrics } from '../utils/telemetry-utils';

const startTime = Date.now();
const result = await executeQuery(query);
const duration = Date.now() - startTime;

recordQueryMetrics(
  container.telemetry,
  container,
  duration,
  result.rows.length,
  {
    'query.type': 'sql',
    'query.datasource': datasourceId,
  },
);
```

### Interactive Mode

```typescript
// In interactive-repl.ts
private async processAgentQuery(query: string): Promise<void> {
  await withCommandSpan(
    this.container.telemetry,
    this.container,
    'interactive.query',
    { query },
    'interactive', // Note: mode is 'interactive'
    async (span) => {
      this.container.telemetry.captureEvent({
        name: CLI_EVENTS.QUERY_EXECUTED,
        attributes: {
          'query.length': query.length,
        },
      });

      const response = await agent.respond({ messages });
      
      if (response.usage) {
        recordTokenUsage(
          this.container.telemetry,
          this.container,
          response.usage.promptTokens,
          response.usage.completionTokens,
        );
      }

      return response;
    },
  );
}
```

---

## Agent Examples

### FactoryAgent Integration

```typescript
// In CLI or Web/Desktop app
const agent = new FactoryAgent({
  conversationSlug: 'conversation-123',
  repositories,
  telemetry: container.telemetry, // Pass telemetry instance
});

// Telemetry is automatically instrumented:
// - Conversation span in respond()
// - Message span per user input
// - Actor spans in XState
// - LLM spans in providers
```

### Manual Span Creation (Advanced)

```typescript
// In FactoryAgent.respond()
const conversationSpan = this.telemetry?.startSpan('agent.conversation', {
  'agent.conversation.id': this.conversationSlug,
  'agent.id': this.id,
  'agent.conversation.message_count': opts.messages.length,
});

this.telemetry?.captureEvent({
  name: AGENT_EVENTS.CONVERSATION_STARTED,
  attributes: {
    'agent.conversation.id': this.conversationSlug,
  },
});

try {
  // ... agent logic
  this.telemetry?.endSpan(conversationSpan, true);
} catch (error) {
  this.telemetry?.endSpan(conversationSpan, false);
  throw error;
}
```

### Actor Span Wrapper

```typescript
// In state-machine.ts
const detectIntentActor = fromPromise(
  async ({ input }) => {
    if (!telemetry) {
      return await detectIntent(input.inputMessage);
    }

    const parentContext = otelContext.active();
    const tracer = trace.getTracer('qwery-telemetry');
    const span = tracer.startSpan(
      'agent.actor.detectIntent',
      {
        attributes: {
          'agent.actor.id': 'detectIntent',
          'agent.actor.type': 'detectIntent',
          'agent.conversation.id': conversationId,
        },
      },
      parentContext,
    );

    telemetry.captureEvent({
      name: AGENT_EVENTS.ACTOR_INVOKED,
      attributes: {
        'agent.actor.id': 'detectIntent',
        'agent.conversation.id': conversationId,
      },
    });

    return otelContext.with(
      trace.setSpan(parentContext, span),
      async () => {
        try {
          const result = await detectIntent(input.inputMessage);
          
          // Record token usage if available
          if (result.usage) {
            const usage = result.usage as any;
            const promptTokens = usage.promptTokens ?? 0;
            const completionTokens = usage.completionTokens ?? 0;
            
            if (promptTokens > 0 || completionTokens > 0) {
              telemetry.recordTokenUsage(
                promptTokens,
                completionTokens,
                {
                  'agent.llm.model.name': 'gpt-5-mini',
                  'agent.llm.provider.id': 'azure',
                  'agent.actor.id': 'detectIntent',
                  'agent.conversation.id': conversationId,
                },
              );
            }
          }

          telemetry.captureEvent({
            name: AGENT_EVENTS.ACTOR_COMPLETED,
            attributes: {
              'agent.actor.id': 'detectIntent',
              'agent.actor.status': 'success',
            },
          });

          telemetry.endSpan(span, true);
          return result.object;
        } catch (error) {
          telemetry.captureEvent({
            name: AGENT_EVENTS.ACTOR_FAILED,
            attributes: {
              'agent.actor.id': 'detectIntent',
              'error.type': error instanceof Error ? error.name : 'UnknownError',
              'error.message': error instanceof Error ? error.message : String(error),
            },
          });
          telemetry.endSpan(span, false);
          throw error;
        }
      }
    );
  },
);
```

### LLM Span in Provider

```typescript
// In webllm-model.provider.ts
doGenerate: async (options) => {
  const span = trace.getTracer('agent-factory-sdk').startSpan('agent.llm.call', {
    attributes: {
      'agent.llm.model.name': modelName,
      'agent.llm.provider.id': 'webllm',
      'agent.llm.temperature': options.temperature,
      'agent.llm.max_tokens': options.maxTokens,
    },
  });

  try {
    telemetry?.captureEvent({
      name: AGENT_EVENTS.LLM_CALL_STARTED,
      attributes: {
        'agent.llm.model.name': modelName,
        'agent.llm.provider.id': 'webllm',
      },
    });

    const response = await engine.chat.completions.create(...);
    
    // Extract token usage
    const promptTokens = response.usage?.promptTokens ?? 0;
    const completionTokens = response.usage?.completionTokens ?? 0;
    const totalTokens = response.usage?.totalTokens ?? 0;

    span.setAttributes({
      'agent.llm.prompt.tokens': promptTokens,
      'agent.llm.completion.tokens': completionTokens,
      'agent.llm.total.tokens': totalTokens,
    });

    telemetry?.captureEvent({
      name: AGENT_EVENTS.LLM_CALL_COMPLETED,
      attributes: {
        'agent.llm.model.name': modelName,
        'agent.llm.provider.id': 'webllm',
        'agent.llm.prompt.tokens': String(promptTokens),
        'agent.llm.completion.tokens': String(completionTokens),
      },
    });

    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
    return result;
  } catch (error) {
    telemetry?.captureEvent({
      name: AGENT_EVENTS.LLM_CALL_ERROR,
      attributes: {
        'agent.llm.model.name': modelName,
        'error.type': error instanceof Error ? error.name : 'UnknownError',
        'error.message': error instanceof Error ? error.message : String(error),
      },
    });
    span.setStatus({ code: SpanStatusCode.ERROR });
    span.end();
    throw error;
  }
}
```

---

## Web Examples

### React Component with Telemetry

```typescript
import { TelemetryProvider, useTelemetry, WEB_EVENTS } from '@qwery/telemetry-opentelemetry';
import { withActionSpan } from '@qwery/telemetry-opentelemetry/telemetry-utils';

function App() {
  const telemetry = new TelemetryManager('qwery-web', sessionId);
  
  return (
    <TelemetryProvider telemetry={telemetry}>
      <MyComponent />
    </TelemetryProvider>
  );
}

function MyComponent() {
  const { telemetry, workspace } = useTelemetry();
  
  const handleCreateNotebook = async () => {
    await withActionSpan(
      telemetry,
      {
        actionName: 'notebook.create',
        appType: 'web',
        mode: 'browser',
        workspace: {
          userId: workspace.userId,
          projectId: workspace.projectId,
        },
      },
      async (span) => {
        telemetry.captureEvent({
          name: WEB_EVENTS.UI_BUTTON_CLICK,
          attributes: {
            'web.ui.element': 'create-notebook-button',
          },
        });

        const notebook = await createNotebook({ name: 'My Notebook' });
        
        telemetry.captureEvent({
          name: WEB_EVENTS.API_CALL,
          attributes: {
            'web.api.endpoint': '/api/notebooks',
            'web.api.method': 'POST',
            'web.api.status': '200',
          },
        });

        return notebook;
      },
    );
  };

  return <button onClick={handleCreateNotebook}>Create Notebook</button>;
}
```

---

## Desktop Examples

### Electron App with Telemetry

```typescript
import { TelemetryManager } from '@qwery/telemetry-opentelemetry';
import { withActionSpan } from '@qwery/telemetry-opentelemetry/telemetry-utils';
import { DESKTOP_EVENTS } from '@qwery/telemetry-opentelemetry/events/desktop.events';

const telemetry = new TelemetryManager('qwery-desktop', sessionId);
await telemetry.init();

// In Electron main process or renderer
await withActionSpan(
  telemetry,
  {
    actionName: 'datasource.connect',
    appType: 'desktop',
    mode: 'electron',
    workspace: { userId, projectId },
  },
  async (span) => {
    telemetry.captureEvent({
      name: DESKTOP_EVENTS.MENU_ACTION,
      attributes: {
        'desktop.menu.action': 'connect-datasource',
      },
    });

    const connection = await connectDatasource(datasourceId);
    return connection;
  },
);
```

---

## Common Patterns

### Error Handling

```typescript
try {
  await withCommandSpan(telemetry, container, 'command.name', options, 'command', async (span) => {
    // Command logic
  });
} catch (error) {
  // Error is automatically captured in the span
  // Additional error event can be captured:
  telemetry.captureEvent({
    name: CLI_EVENTS.COMMAND_ERROR,
    attributes: {
      'error.type': error instanceof Error ? error.name : 'UnknownError',
      'error.message': error instanceof Error ? error.message : String(error),
    },
  });
  throw error;
}
```

### Conditional Telemetry

```typescript
if (telemetry) {
  const span = telemetry.startSpan('operation.name', attributes);
  try {
    // Operation logic
    telemetry.endSpan(span, true);
  } catch (error) {
    telemetry.endSpan(span, false);
    throw error;
  }
} else {
  // Fallback without telemetry
  // Operation logic
}
```

### Recording Custom Metrics

```typescript
// Record custom counter
telemetry.recordCommandCount({
  'cli.command.name': 'custom.operation',
  'cli.command.status': 'success',
});

// Record custom histogram
telemetry.recordCommandDuration(150, {
  'cli.command.name': 'custom.operation',
});
```

---

## Event Reference

### CLI Events

See `src/events/cli.events.ts` for complete list:
- `COMMAND_STARTED`, `COMMAND_COMPLETED`, `COMMAND_ERROR`
- `COMMAND_VALIDATED`, `COMMAND_CREATING`, `COMMAND_CREATED`
- `QUERY_EXECUTED`, `QUERY_ERROR`
- And more...

### Agent Events

See `src/events/agent.events.ts` for complete list:
- `CONVERSATION_STARTED`, `CONVERSATION_COMPLETED`, `CONVERSATION_ERROR`
- `MESSAGE_RECEIVED`, `MESSAGE_PROCESSED`, `MESSAGE_ERROR`
- `ACTOR_INVOKED`, `ACTOR_COMPLETED`, `ACTOR_FAILED`
- `LLM_CALL_STARTED`, `LLM_CALL_COMPLETED`, `LLM_CALL_ERROR`

### Web Events

See `src/events/web.events.ts` for complete list:
- `PAGE_VIEW`, `PAGE_LOAD`, `PAGE_UNLOAD`
- `UI_BUTTON_CLICK`, `UI_FORM_SUBMIT`
- `API_CALL`, `API_ERROR`
- And more...

### Desktop Events

See `src/events/desktop.events.ts` for complete list:
- `WINDOW_OPEN`, `WINDOW_CLOSE`, `WINDOW_MAXIMIZE`
- `MENU_ACTION`, `SHORTCUT_TRIGGERED`
- `DESKTOP_COMMAND_EXECUTION`
- And more...

---

## Testing

### Console Exporter (Default)

```bash
# Spans will be printed to console
pnpm --filter cli build
node dist/index.js project list
```

### OTLP Exporter

```bash
# Export to OTLP collector
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces \
  node dist/index.js project list
```

---

## Best Practices

1. **Always use wrappers** - Use `withCommandSpan` or `withActionSpan` when possible
2. **Capture milestones** - Use `captureEvent()` for important milestones
3. **Record metrics** - Use `recordTokenUsage()` and `recordQueryMetrics()` for AI and queries
4. **Handle errors** - Errors are automatically captured, but you can add additional context
5. **Use event constants** - Import and use event constants from event files
6. **Correlate spans** - Use `agent.conversation.id` or `cli.session.id` for correlation

---

## References

- [Implementation Guide](./IMPLEMENTATION.md)
- [Package Structure](./STRUCTURE.md)
- [Event Definitions](../src/events/)
