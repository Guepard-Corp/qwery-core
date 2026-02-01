import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { CreateConversationService } from '@qwery/domain/services';
import type { Repositories } from '@qwery/domain/repositories';
import { createRepositories } from '../lib/repositories';

const TUI_PROJECT_ID = '00000000-0000-0000-0000-000000000001';
const TUI_TASK_ID = '00000000-0000-0000-0000-000000000002';

const createBodySchema = z.object({
  title: z.string().optional().default('New Conversation'),
  seedMessage: z.string().optional().default(''),
});

let repositoriesPromise: Promise<Repositories> | undefined;

async function getRepositories(): Promise<Repositories> {
  if (!repositoriesPromise) {
    repositoriesPromise = createRepositories();
  }
  return repositoriesPromise;
}

export function createConversationsRoutes() {
  const app = new Hono();

  app.post('/', zValidator('json', createBodySchema), async (c) => {
    const body = c.req.valid('json');
    const repositories = await getRepositories();

    const useCase = new CreateConversationService(repositories.conversation);
    const conversation = await useCase.execute({
      title: body.title,
      seedMessage: body.seedMessage,
      projectId: TUI_PROJECT_ID,
      taskId: TUI_TASK_ID,
      datasources: [],
      createdBy: 'tui',
    });

    return c.json(conversation, 201);
  });

  return app;
}
