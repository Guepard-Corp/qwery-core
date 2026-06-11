import type { AgentId } from '@qwery/agent-factory-sdk';

/**
 * Agents that kick off a default task the moment they are selected (mirrors the
 * db-audit TUI's auto-run on agent selection). Agents absent from this map are
 * pin-only and wait for the user to type a prompt — generalist agents (`data`,
 * `code`) have no single obvious default task, so they are intentionally
 * omitted. The wording matches db-audit's seed prompts so a run here is
 * comparable to one there.
 */
export const AGENT_AUTORUN_PROMPTS: Partial<Record<AgentId, string>> = {
  'db-performance-audit':
    'Run a PostgreSQL database performance audit for the current datasource. Focus on the top latency-impact findings, back every conclusion with evidence, and include validation steps for each recommendation.',
  'slow-query-optimizer':
    'Optimize the slowest PostgreSQL queries for the current datasource. Pull the slowest queries, inspect their full execution plans, test the strongest fix, and report the measured before and after performance diff.',
};

/**
 * The seed prompt to auto-submit when `agentId` is selected, or `undefined` when
 * that agent is pin-only (including the unpinned `null` case).
 */
export function autoRunPromptFor(agentId: AgentId | null): string | undefined {
  return agentId === null ? undefined : AGENT_AUTORUN_PROMPTS[agentId];
}
