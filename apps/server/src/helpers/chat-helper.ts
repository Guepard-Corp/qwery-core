import type { UIMessage } from '@qwery/agent-factory-sdk';
import { normalizeUIRole } from '@qwery/shared/message-role-utils';
import type { Repositories } from '@qwery/domain/repositories';

/**
 * Resolves datasources for a chat request: body first, then last user message metadata, then conversation.
 */
export async function resolveChatDatasources(params: {
  bodyDatasources: string[] | undefined;
  messages: UIMessage[];
  conversationSlug: string;
  conversationRepository: Pick<Repositories['conversation'], 'findBySlug'>;
}): Promise<string[] | undefined> {
  const {
    bodyDatasources,
    messages,
    conversationSlug,
    conversationRepository,
  } = params;

  if (bodyDatasources && bodyDatasources.length > 0) {
    return bodyDatasources;
  }

  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => normalizeUIRole(m.role) === 'user');
  const metadataDatasources = (
    (lastUserMessage?.metadata ?? {}) as Record<string, unknown>
  ).datasources as string[] | undefined;

  if (metadataDatasources && metadataDatasources.length > 0) {
    return metadataDatasources;
  }

  const conversation =
    await conversationRepository.findBySlug(conversationSlug);
  const conversationDatasources = conversation?.datasources;

  if (conversationDatasources && conversationDatasources.length > 0) {
    return conversationDatasources;
  }

  return undefined;
}
