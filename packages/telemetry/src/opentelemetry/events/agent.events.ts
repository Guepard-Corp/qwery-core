/**
 * Agent Event Schemas and Constants
 *
 * Defines event types and their expected attributes for Agent telemetry
 */

export const AGENT_EVENTS = {
  // Conversation lifecycle
  CONVERSATION_STARTED: 'agent.conversation.started',
  CONVERSATION_COMPLETED: 'agent.conversation.completed',
  CONVERSATION_ERROR: 'agent.conversation.error',

  // Message processing
  MESSAGE_RECEIVED: 'agent.message.received',
  MESSAGE_PROCESSED: 'agent.message.processed',
  MESSAGE_ERROR: 'agent.message.error',

  // Actor lifecycle
  ACTOR_INVOKED: 'agent.actor.invoked',
  ACTOR_COMPLETED: 'agent.actor.completed',
  ACTOR_FAILED: 'agent.actor.failed',

  // LLM calls
  LLM_CALL_STARTED: 'agent.llm.call.started',
  LLM_CALL_COMPLETED: 'agent.llm.call.completed',
  LLM_CALL_ERROR: 'agent.llm.call.error',
  LLM_TOKENS_USED: 'agent.llm.tokens.used',

  // Context loading
  CONTEXT_LOADED: 'agent.context.loaded',
  CONTEXT_ERROR: 'agent.context.error',
} as const;

export type AgentEventName = (typeof AGENT_EVENTS)[keyof typeof AGENT_EVENTS];

/**
 * Agent Event Attribute Schemas
 */
export interface AgentConversationAttributes {
  'agent.conversation.id': string;
  'agent.id': string;
  'agent.conversation.message_count'?: number;
  'agent.conversation.duration_ms'?: string;
  'agent.conversation.status'?: 'success' | 'error';
}

export interface AgentMessageAttributes {
  'agent.message.id'?: string;
  'agent.message.text': string;
  'agent.message.index'?: number;
  'agent.message.role'?: 'user' | 'assistant' | 'system';
  'agent.conversation.id': string;
  'agent.message.duration_ms'?: string;
}

export interface AgentActorAttributes {
  'agent.actor.id': string;
  'agent.actor.type':
    | 'detectIntent'
    | 'summarizeIntent'
    | 'greeting'
    | 'readData'
    | 'loadContext';
  'agent.actor.input'?: string; // JSON stringified
  'agent.actor.output'?: string; // JSON stringified
  'agent.actor.duration_ms'?: string;
  'agent.actor.status'?: 'success' | 'error';
  'agent.conversation.id': string;
}

export interface AgentLLMAttributes {
  'agent.llm.model.name': string;
  'agent.llm.provider.id': string;
  'agent.llm.prompt.tokens'?: number;
  'agent.llm.completion.tokens'?: number;
  'agent.llm.total.tokens'?: number;
  'agent.llm.duration_ms'?: string;
  'agent.llm.temperature'?: number;
  'agent.llm.max_tokens'?: number;
  'agent.llm.status'?: 'success' | 'error';
  'agent.conversation.id'?: string;
  'agent.actor.id'?: string;
}

export interface AgentContextAttributes {
  'agent.context.conversation.id': string;
  'agent.context.message_count'?: number;
  'agent.context.duration_ms'?: string;
  'agent.context.status'?: 'success' | 'error';
}

export interface AgentErrorAttributes {
  'error.type': string;
  'error.message'?: string;
  'error.stack'?: string;
  'agent.conversation.id'?: string;
  'agent.actor.id'?: string;
  'agent.message.id'?: string;
}

/**
 * Complete Agent event attributes (union of all attribute types)
 */
export type AgentEventAttributes = AgentConversationAttributes &
  AgentMessageAttributes &
  AgentActorAttributes &
  AgentLLMAttributes &
  AgentContextAttributes &
  AgentErrorAttributes &
  Record<string, string | number | boolean | undefined>;
