import { Hono } from 'hono';
import {
  CreateNotebookService,
  DeleteNotebookService,
  GetNotebookBySlugService,
  GetNotebookService,
  GetNotebooksByProjectIdService,
  UpdateNotebookService,
} from '@qwery/domain/services';
import type { Repositories } from '@qwery/domain/repositories';
import {
  handleDomainException,
  isUUID,
  createNotFoundErrorResponse,
  createValidationErrorResponse,
} from '../lib/http-utils';
import { Code } from '@qwery/domain/common';

export function createNotebooksRoutes(
  getRepositories: () => Promise<Repositories>,
) {
  const app = new Hono();

  app.get('/', async (c) => {
    try {
      const repos = await getRepositories();
      const projectId = c.req.query('projectId');

      if (projectId) {
        const useCase = new GetNotebooksByProjectIdService(repos.notebook);
        const notebooks = await useCase.execute(projectId);
        return c.json(notebooks ?? []);
      }

      const notebooks = await repos.notebook.findAll();
      return c.json(notebooks);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.post('/', async (c) => {
    try {
      const repos = await getRepositories();
      const body = await c.req.json();
      const useCase = new CreateNotebookService(repos.notebook);
      const notebook = await useCase.execute(body);

      try {
        const notebookTitle = `Notebook - ${notebook.id}`;
        const existingConversations = await repos.conversation.findByProjectId(
          notebook.projectId,
        );
        const existingConversation = existingConversations.find(
          (conv) => conv.title === notebookTitle,
        );

        if (!existingConversation) {
          const notebookWithCreatedBy = notebook as { createdBy?: string };
          const userId =
            notebookWithCreatedBy.createdBy ??
            (body as { createdBy?: string }).createdBy ??
            (body as { userId?: string }).userId ??
            'system';

          await repos.conversation.create({
            id: crypto.randomUUID(),
            slug: '',
            title: notebookTitle,
            projectId: notebook.projectId,
            taskId: crypto.randomUUID(),
            datasources: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: userId,
            updatedBy: userId,
            isPublic: false,
            seedMessage: '',
          });
        }
      } catch {
        // Do not fail notebook creation if conversation creation fails
      }

      return c.json(notebook, 201);
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
          Code.NOTEBOOK_NOT_FOUND_ERROR,
        );

      const repos = await getRepositories();
      const useCase = isUUID(id)
        ? new GetNotebookService(repos.notebook)
        : new GetNotebookBySlugService(repos.notebook);
      const notebook = await useCase.execute(id);
      return c.json(notebook);
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
      const useCase = new UpdateNotebookService(repos.notebook);
      const notebook = await useCase.execute({ ...body, id });
      return c.json(notebook);
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
      const useCase = new DeleteNotebookService(repos.notebook);
      await useCase.execute(id);
      return c.json({ success: true });
    } catch (error) {
      return handleDomainException(error);
    }
  });

  return app;
}
