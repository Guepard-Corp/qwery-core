import type { WithParts } from '../llm/message';
import type { AgentInfoWithId } from './agent';
import { buildDatasourceReminder } from './prompts/datasource-reminder';

/**
 * Generic reminder context. Extensible for future reminder types and agents.
 */
export type ReminderContext = {
  /** List of attached datasource names/ids (no full orchestration result). */
  attachedDatasourceNames?: string[];
};

/**
 * Inserts synthetic reminder parts into messages based on agent and context.
 * Generic: add new reminder types by branching on agent.id and context fields.
 * Currently: datasource reminder for query (and ask when attachedDatasourceNames is provided).
 */
export function insertReminders(input: {
  messages: WithParts[];
  agent: AgentInfoWithId;
  context: ReminderContext;
}): WithParts[] {
  const { messages, agent, context } = input;
  const lastUser = messages.findLast((m: WithParts) => m.info.role === 'user');
  if (!lastUser) return messages;

  if (context.attachedDatasourceNames !== undefined) {
    const agentIdsWithDatasourceReminder = ['query', 'ask'];
    if (agentIdsWithDatasourceReminder.includes(agent.id)) {
      lastUser.parts.push({
        type: 'text',
        text: buildDatasourceReminder(context.attachedDatasourceNames),
        synthetic: true,
        messageId: lastUser.info.id,
      } as (typeof lastUser.parts)[number]);
    }
  }

  return messages;
}
