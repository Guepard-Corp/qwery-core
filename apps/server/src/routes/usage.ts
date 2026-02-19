import { Hono } from 'hono';
import type { CreateUsageInput } from '@qwery/domain/usecases';
import {
  CreateUsageService,
  GetUsageByConversationSlugService,
} from '@qwery/domain/services';
import type { Repositories } from '@qwery/domain/repositories';
import { getLogger } from '@qwery/shared/logger';
import { handleDomainException } from '../lib/http-utils';

export function createUsageRoutes(
  getRepositories: () => Promise<Repositories>,
) {
  const app = new Hono();

  app.get('/', async (c) => {
    try {
      const repos = await getRepositories();
      const conversationSlug = c.req.query('conversationSlug');
      const userId = c.req.query('userId') ?? '';

      if (!conversationSlug) {
        return c.json(
          { error: 'conversationSlug query parameter is required' },
          400,
        );
      }

      const useCase = new GetUsageByConversationSlugService(
        repos.usage,
        repos.conversation,
      );
      const usage = await useCase.execute({ conversationSlug, userId });
      return c.json(usage);
    } catch (error) {
      const log = await getLogger();
      log.error('[Usage GET]', {
        conversationSlug: c.req.query('conversationSlug'),
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return handleDomainException(error);
    }
  });

  app.post('/', async (c) => {
    try {
      const repos = await getRepositories();
      const body = await c.req.json();
      const { conversationSlug, conversationId, ...input } = body as {
        conversationSlug?: string;
        conversationId?: string;
        [key: string]: unknown;
      };

      let slug = conversationSlug;
      if (!slug && conversationId) {
        const conversation = await repos.conversation.findById(conversationId);
        if (!conversation) {
          return c.json(
            { error: `Conversation with id '${conversationId}' not found` },
            404,
          );
        }
        slug = conversation.slug;
      }

      if (!slug) {
        return c.json(
          { error: 'conversationSlug or conversationId is required' },
          400,
        );
      }

      const useCase = new CreateUsageService(
        repos.usage,
        repos.conversation,
        repos.project,
      );
      const usage = await useCase.execute({
        input: input as CreateUsageInput,
        conversationSlug: slug,
      });

      return c.json(usage, 201);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  return app;
}
