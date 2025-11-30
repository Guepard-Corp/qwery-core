import { Repositories } from '@qwery/domain/repositories';
import { GetMessagesByConversationIdService } from '@qwery/domain/services';
import { fromPromise } from 'xstate/actors';
import { UIMessage } from 'ai';
import { MessagePersistenceService } from '../../services/message-persistence.service';

export const loadContext = async (
  repositories: Repositories,
  conversationId: string,
) => {
  const useCase = new GetMessagesByConversationIdService(repositories.message);
  const messages = await useCase.execute({ conversationId });
  return messages;
};

export const loadContextActor = fromPromise(
  async ({
    input,
  }: {
    input: {
      repositories: Repositories;
      conversationId: string;
    };
  }): Promise<UIMessage[]> => {
    const result = await loadContext(input.repositories, input.conversationId);
    return MessagePersistenceService.convertToUIMessages(result);
  },
);
