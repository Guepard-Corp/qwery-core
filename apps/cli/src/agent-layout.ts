import { AGENT_SPECS, type AgentId } from '@qwery/agent-factory-sdk';

export type LayoutMode = 'focus' | 'split';

/**
 * The layout the TUI should switch to when `agentId` is pinned, or `undefined`
 * when that agent has no preference (leave the current layout untouched). The
 * audit / optimizer specialists prefer the full-screen `focus` layout so their
 * long reports get the whole screen; generalist agents (`data`, `code`) and the
 * unpinned `null` case express no preference.
 */
export function defaultLayoutModeFor(agentId: AgentId | null): LayoutMode | undefined {
  return agentId === null ? undefined : AGENT_SPECS[agentId].defaultLayoutMode;
}
