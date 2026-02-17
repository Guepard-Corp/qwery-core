import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  CreateConversationService,
  DeleteConversationService,
  GetConversationBySlugService,
  GetConversationService,
  GetConversationsByProjectIdService,
  UpdateConversationService,
} from '@qwery/domain/services';
import type { Repositories } from '@qwery/domain/repositories';
import { Code } from '@qwery/domain/common';
import { createRepositories } from '../lib/repositories';
import {
  handleDomainException,
  isUUID,
  createValidationErrorResponse,
  createNotFoundErrorResponse,
} from '../lib/http-utils';

const TUI_PROJECT_ID = '550e8400-e29b-41d4-a716-446655440000';
const TUI_TASK_ID = '550e8400-e29b-41d4-a716-446655440001';

const createBodySchema = z.object({
  title: z.string().optional().default('New Conversation'),
  seedMessage: z.string().optional().default(''),
  projectId: z.uuid().optional(),
  taskId: z.uuid().optional(),
  datasources: z.array(z.string()).optional().default([]),
  createdBy: z.uuid().optional().default('tui'),
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

  app.get('/', async (c) => {
    try {
      const repos = await getRepositories();
      const conversations = await repos.conversation.findAll();
      return c.json(conversations);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.post('/', zValidator('json', createBodySchema), async (c) => {
    try {
      const body = c.req.valid('json');
      const repositories = await getRepositories();

      const useCase = new CreateConversationService(repositories.conversation);
      const conversation = await useCase.execute({
        title: body.title,
        seedMessage: body.seedMessage,
        projectId: body.projectId ?? TUI_PROJECT_ID,
        taskId: body.taskId ?? TUI_TASK_ID,
        datasources: body.datasources ?? [],
        createdBy: body.createdBy ?? 'tui',
      });

      return c.json(conversation, 201);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.get('/project/:projectId', async (c) => {
    try {
      const projectId = c.req.param('projectId');
      if (!projectId) {
        return createValidationErrorResponse('Project ID is required');
      }

      const repos = await getRepositories();
      const useCase = new GetConversationsByProjectIdService(
        repos.conversation,
      );
      const conversations = await useCase.execute(projectId);
      return c.json(conversations);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.get('/:id', async (c) => {
    try {
      const id = c.req.param('id');
      if (!id)
        return createNotFoundErrorResponse(
          'Not found',
          Code.CONVERSATION_NOT_FOUND_ERROR,
        );

      const repos = await getRepositories();
      const useCase = isUUID(id)
        ? new GetConversationService(repos.conversation)
        : new GetConversationBySlugService(repos.conversation);
      const conversation = await useCase.execute(id);
      return c.json(conversation);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.put('/:id', async (c) => {
    try {
      const id = c.req.param('id');
      if (!id)
        return createValidationErrorResponse(
          'Method not allowed',
          Code.BAD_REQUEST_ERROR,
        );

      const repos = await getRepositories();
      const body = await c.req.json();
      const useCase = new UpdateConversationService(repos.conversation);
      const conversation = await useCase.execute({
        ...body,
        id,
        updatedBy: (body as { updatedBy?: string }).updatedBy ?? 'tui',
      });
      return c.json(conversation);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.delete('/:id', async (c) => {
    try {
      const id = c.req.param('id');
      if (!id)
        return createValidationErrorResponse(
          'Method not allowed',
          Code.BAD_REQUEST_ERROR,
        );

      const repos = await getRepositories();
      const useCase = new DeleteConversationService(repos.conversation);
      await useCase.execute(id);
      return c.json({ success: true });
    } catch (error) {
      return handleDomainException(error);
    }
  });

  return app;
}
