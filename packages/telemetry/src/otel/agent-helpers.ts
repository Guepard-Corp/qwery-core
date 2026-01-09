/**
 * Agent Telemetry Helpers
 *
 * Provides type-safe helper functions for agent telemetry operations.
 * All telemetry logic is centralized here to reduce duplication and ensure consistency.
 */

import type { TelemetryManager } from './manager';
import type { Span } from '@opentelemetry/api';
import { AGENT_EVENTS } from '../events/agent.events';
import type {
  AgentConversationAttributes,
  AgentMessageAttributes,
  AgentActorAttributes,
  AgentLLMAttributes,
  AgentErrorAttributes,
} from '../events/agent.events';
import { context as otelContext, trace } from '@opentelemetry/api';

/**
 * Helper to parse model string and extract provider/model name
 * Handles formats like "azure/gpt-5-mini" or just "gpt-5-mini"
 */
function parseModel(model: string): {
  provider: string;
  modelName: string;
  fullModel: string;
} {
  const parts = model.split('/');
  if (parts.length === 2) {
    return {
      provider: parts[0]!,
      modelName: parts[1]!,
      fullModel: model,
    };
  }
  // Default provider to 'azure' if not specified (for backward compatibility)
  return {
    provider: 'azure',
    modelName: model,
    fullModel: model,
  };
}

/**
 * Creates conversation span attributes using type-safe interface
 */
export function createConversationAttributes(
  conversationId: string,
  agentId: string,
  messageCount: number,
): AgentConversationAttributes {
  return {
    'agent.conversation.id': conversationId,
    'agent.id': agentId,
    'agent.conversation.message_count': messageCount,
  };
}

/**
 * Creates message span attributes using type-safe interface
 */
export function createMessageAttributes(
  conversationId: string,
  text: string,
  index: number,
  role: 'user' | 'assistant' | 'system',
): AgentMessageAttributes {
  return {
    'agent.conversation.id': conversationId,
    'agent.message.text': text,
    'agent.message.index': index,
    'agent.message.role': role,
  };
}

/**
 * Creates actor span attributes using type-safe interface
 * Includes model information if provided
 */
export function createActorAttributes(
  actorId: string,
  actorType: AgentActorAttributes['agent.actor.type'],
  conversationId: string,
  model?: string,
  input?: Record<string, unknown>,
): AgentActorAttributes & Partial<AgentLLMAttributes> & Record<string, unknown> {
  const baseAttributes: AgentActorAttributes = {
    'agent.actor.id': actorId,
    'agent.actor.type': actorType,
    'agent.conversation.id': conversationId,
  };

  if (input) {
    baseAttributes['agent.actor.input'] = JSON.stringify(input);
  }

  const attributes: AgentActorAttributes &
    Partial<AgentLLMAttributes> &
    Record<string, unknown> = { ...baseAttributes };

  if (model) {
    const { provider, modelName, fullModel } = parseModel(model);
    attributes['agent.llm.model'] = fullModel;
    attributes['agent.llm.model.name'] = modelName;
    attributes['agent.llm.provider.id'] = provider;
  }

  return attributes;
}

/**
 * Ends message span with event and duration recording
 */
export function endMessageSpanWithEvent(
  telemetry: TelemetryManager,
  span: Span | undefined,
  conversationId: string,
  startTime: number,
  success: boolean,
  errorMessage?: string,
): void {
  if (!span) return;

  const duration = Date.now() - startTime;
  const eventName = success
    ? AGENT_EVENTS.MESSAGE_PROCESSED
    : AGENT_EVENTS.MESSAGE_ERROR;

  const attributes: Partial<AgentMessageAttributes> & Partial<AgentErrorAttributes> = {
    'agent.conversation.id': conversationId,
    'agent.message.duration_ms': String(duration),
    ...(errorMessage && { 'error.message': errorMessage }),
  };

  telemetry.captureEvent({
    name: eventName,
    attributes: attributes as Record<string, unknown>,
  });
  telemetry.recordMessageDuration(duration, {
    'agent.conversation.id': conversationId,
    'agent.message.status': success ? 'success' : 'error',
    ...(errorMessage && { 'error.message': errorMessage }),
  });
  telemetry.endSpan(span, success);
}

/**
 * Ends conversation span with event and duration recording
 */
export function endConversationSpanWithEvent(
  telemetry: TelemetryManager,
  span: Span | undefined,
  conversationId: string,
  startTime: number,
  success: boolean,
  errorMessage?: string,
): void {
  if (!span) return;

  const duration = Date.now() - startTime;
  const eventName = success
    ? AGENT_EVENTS.CONVERSATION_COMPLETED
    : AGENT_EVENTS.CONVERSATION_ERROR;

  const attributes: Partial<AgentConversationAttributes> &
    Partial<AgentErrorAttributes> = {
    'agent.conversation.id': conversationId,
    'agent.conversation.duration_ms': String(duration),
    'agent.conversation.status': success ? 'success' : 'error',
    ...(errorMessage && { 'error.message': errorMessage }),
  };

  telemetry.captureEvent({
    name: eventName,
    attributes: attributes as Record<string, unknown>,
  });
  telemetry.endSpan(span, success);
}

/**
 * Ends actor span with event and duration recording
 */
export function endActorSpanWithEvent(
  telemetry: TelemetryManager,
  span: Span | undefined,
  actorId: string,
  actorType: AgentActorAttributes['agent.actor.type'],
  conversationId: string,
  startTime: number,
  success: boolean,
  errorMessage?: string,
  errorType?: string,
): void {
  if (!span) return;

  const duration = Date.now() - startTime;
  const eventName = success
    ? AGENT_EVENTS.ACTOR_COMPLETED
    : AGENT_EVENTS.ACTOR_FAILED;

  const attributes: Partial<AgentActorAttributes> &
    Partial<AgentErrorAttributes> = {
    'agent.actor.id': actorId,
    'agent.actor.type': actorType,
    'agent.actor.duration_ms': String(duration),
    'agent.actor.status': success ? 'success' : 'error',
    'agent.conversation.id': conversationId,
    ...(errorMessage && { 'error.message': errorMessage }),
    ...(errorType && { 'error.type': errorType }),
  };

  telemetry.captureEvent({
    name: eventName,
    attributes: attributes as Record<string, unknown>,
  });
  telemetry.endSpan(span, success);
}

/**
 * Helper to safely extract token usage from usage objects
 * Different providers use different property names
 */
function extractTokenUsage(usage: unknown): {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
} {
  if (!usage || typeof usage !== 'object') {
    return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  }

  const usageObj = usage as Record<string, unknown>;
  const promptTokens =
    (typeof usageObj.inputTokens === 'number' ? usageObj.inputTokens : 0) ||
    (typeof usageObj.promptTokens === 'number' ? usageObj.promptTokens : 0) ||
    (typeof usageObj.prompt_tokens === 'number' ? usageObj.prompt_tokens : 0) ||
    0;

  const completionTokens =
    (typeof usageObj.outputTokens === 'number' ? usageObj.outputTokens : 0) ||
    (typeof usageObj.completionTokens === 'number'
      ? usageObj.completionTokens
      : 0) ||
    (typeof usageObj.completion_tokens === 'number'
      ? usageObj.completion_tokens
      : 0) ||
    0;

  const totalTokens =
    (typeof usageObj.totalTokens === 'number' ? usageObj.totalTokens : 0) ||
    (typeof usageObj.total_tokens === 'number' ? usageObj.total_tokens : 0) ||
    promptTokens + completionTokens;

  return { promptTokens, completionTokens, totalTokens };
}

/**
 * Wraps an actor function with telemetry instrumentation
 * Handles span creation, token usage recording, and error handling
 */
export async function withActorTelemetry<T>(
  telemetry: TelemetryManager,
  actorId: string,
  actorType: AgentActorAttributes['agent.actor.type'],
  conversationId: string,
  model: string,
  actorFn: (span: Span) => Promise<T>,
  input?: Record<string, unknown>,
): Promise<T> {
  const startTime = Date.now();
  const { provider, modelName, fullModel } = parseModel(model);

  // Create span with actor attributes
  const spanAttributes = createActorAttributes(
    actorId,
    actorType,
    conversationId,
    model,
    input,
  );

  const span = telemetry.startSpan(`agent.actor.${actorId}`, spanAttributes);

  // Capture actor invoked event
  telemetry.captureEvent({
    name: AGENT_EVENTS.ACTOR_INVOKED,
    attributes: {
      'agent.actor.id': actorId,
      'agent.actor.type': actorType,
      'agent.conversation.id': conversationId,
    },
  });

  // Run within the span's context to ensure proper nesting
  return otelContext.with(
    trace.setSpan(otelContext.active(), span),
    async () => {
      try {
        const result = await actorFn(span);

        // If result has usage property, record token usage
        if (
          result &&
          typeof result === 'object' &&
          'usage' in result &&
          result.usage
        ) {
          try {
            const usage =
              result.usage instanceof Promise
                ? await result.usage
                : result.usage;

            if (usage) {
              const { promptTokens, completionTokens, totalTokens } =
                extractTokenUsage(usage);

              if (promptTokens > 0 || completionTokens > 0) {
                // Add token usage as span attributes
                span.setAttributes({
                  'agent.llm.prompt.tokens': promptTokens,
                  'agent.llm.completion.tokens': completionTokens,
                  'agent.llm.total.tokens': totalTokens,
                });

                // Record as metrics
                telemetry.recordAgentTokenUsage(promptTokens, completionTokens, {
                  'agent.llm.model.name': modelName,
                  'agent.llm.provider.id': provider,
                  'agent.actor.id': actorId,
                  'agent.conversation.id': conversationId,
                });
              }
            }
          } catch {
            // Ignore errors in usage capture
          }
        }

        endActorSpanWithEvent(
          telemetry,
          span,
          actorId,
          actorType,
          conversationId,
          startTime,
          true,
        );

        // Return the result (unwrap if it has an object property like detectIntent)
        if (
          result &&
          typeof result === 'object' &&
          'object' in result &&
          result.object
        ) {
          return result.object as T;
        }

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorType =
          error instanceof Error ? error.name : 'UnknownError';

        endActorSpanWithEvent(
          telemetry,
          span,
          actorId,
          actorType,
          conversationId,
          startTime,
          false,
          errorMessage,
          errorType,
        );

        throw error;
      }
    },
  );
}

