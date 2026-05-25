/**
 * Agent event names — stable, dotted identifiers shared by all backends.
 * Use these constants rather than raw strings so analytics and traces line up.
 */
export const AGENT_EVENTS = {
  /** Span name for a full agent turn (one user prompt → final answer). */
  TURN: 'agent.turn',
  TURN_COMPLETED: 'agent.turn.completed',

  LLM_TOKENS_USED: 'agent.llm.tokens.used',

  TOOL_INVOKED: 'agent.tool.invoked',
  TOOL_COMPLETED: 'agent.tool.completed',
  TOOL_FAILED: 'agent.tool.failed',

  COMPACTION_APPLIED: 'agent.compaction.applied',
} as const;

export type AgentEventName = (typeof AGENT_EVENTS)[keyof typeof AGENT_EVENTS];
