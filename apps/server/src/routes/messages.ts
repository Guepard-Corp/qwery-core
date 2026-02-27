import { Hono } from 'hono';
import {
  GetMessagesByConversationSlugService,
  GetMessagesPaginatedService,
} from '@qwery/domain/services';
import type { Repositories } from '@qwery/domain/repositories';
import {
  handleDomainException,
  createValidationErrorResponse,
} from '../lib/http-utils';

export function createMessagesRoutes(
  getRepositories: () => Promise<Repositories>,
) {
  const app = new Hono();

  app.get('/', async (c) => {
    try {
      const repos = await getRepositories();
      const conversationSlug = c.req.query('conversationSlug');
      const cursor = c.req.query('cursor');
      const limitParam = c.req.query('limit');
      const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;

      if (!conversationSlug) {
        return createValidationErrorResponse(
          'conversationSlug query parameter is required',
        );
      }

      if (cursor !== undefined && cursor !== null && cursor !== '') {
        const useCase = new GetMessagesPaginatedService(
          repos.message,
          repos.conversation,
        );
        const result = await useCase.execute({
          conversationSlug,
          cursor,
          limit,
        });
        return c.json(result);
      }

      const useCase = new GetMessagesByConversationSlugService(
        repos.message,
        repos.conversation,
      );
      const messages = await useCase.execute({ conversationSlug });
      return c.json(messages);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  return app;
}
