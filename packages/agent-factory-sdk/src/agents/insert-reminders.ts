import type { WithParts } from '../llm/message';
import type { AgentInfoWithId } from './agent';
import { buildDatasourceReminder } from './prompts/datasource-reminder';

const TODO_REMINDER =
  '<system-reminder>\nConsider using the todo list tool to plan and track steps for this request.\n</system-reminder>';

const agentIdsWithDatasourceReminder = ['query', 'ask'];
const agentIdsWithTodoReminder = ['query', 'ask'];

function getLastUserMessageText(lastUser: WithParts): string {
  return lastUser.parts
    .filter(
      (p): p is { type: 'text'; text: string } =>
        p.type === 'text' &&
        'text' in p &&
        typeof (p as { text?: string }).text === 'string',
    )
    .map((p) => p.text)
    .join(' ')
    .trim();
}

function messageSuggestsMultiStep(text: string): boolean {
  if (!text || text.length < 10) return false;
  const lower = text.toLowerCase();
  if (/\b(and|then|also)\b/.test(lower)) return true;
  if ((text.match(/\d+\.\s+\w+/g) ?? []).length >= 2) return true;
  if (/first,|second,|third,|1\)|2\)|3\)/i.test(text)) return true;
  const commaCount = (text.match(/,/g) ?? []).length;
  if (commaCount >= 2 && text.length > 40) return true;
  return false;
}

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
 * Currently: datasource reminder for query (and ask when attachedDatasourceNames is provided);
 * optional todo reminder when the last user message suggests a multi-step request.
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
    if (agentIdsWithDatasourceReminder.includes(agent.id)) {
      lastUser.parts.push({
        type: 'text',
        text: buildDatasourceReminder(context.attachedDatasourceNames),
        synthetic: true,
        messageId: lastUser.info.id,
      } as (typeof lastUser.parts)[number]);
    }
  }

  if (
    agentIdsWithTodoReminder.includes(agent.id) &&
    messageSuggestsMultiStep(getLastUserMessageText(lastUser))
  ) {
    lastUser.parts.push({
      type: 'text',
      text: TODO_REMINDER,
      synthetic: true,
      messageId: lastUser.info.id,
    } as (typeof lastUser.parts)[number]);
  }

  return messages;
}
