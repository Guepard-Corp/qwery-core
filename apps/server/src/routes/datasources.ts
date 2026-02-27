import { Hono } from 'hono';
import {
  CreateDatasourceService,
  DeleteDatasourceService,
  GetDatasourceBySlugService,
  GetDatasourceService,
  UpdateDatasourceService,
} from '@qwery/domain/services';
import type { Repositories } from '@qwery/domain/repositories';
import {
  handleDomainException,
  isUUID,
  createNotFoundErrorResponse,
  createValidationErrorResponse,
} from '../lib/http-utils';
import { Code } from '@qwery/domain/common';

export function createDatasourcesRoutes(
  getRepositories: () => Promise<Repositories>,
) {
  const app = new Hono();

  app.get('/', async (c) => {
    try {
      const repos = await getRepositories();
      const projectId = c.req.query('projectId');

      if (!projectId) {
        return c.json(
          {
            error: 'projectId query parameter is required',
            message:
              'Datasources must be fetched for a specific project. Please provide a projectId query parameter.',
          },
          400,
        );
      }

      const datasources = await repos.datasource.findByProjectId(projectId);
      return c.json(datasources ?? []);
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
          Code.DATASOURCE_NOT_FOUND_ERROR,
        );

      const repos = await getRepositories();
      const useCase = isUUID(id)
        ? new GetDatasourceService(repos.datasource)
        : new GetDatasourceBySlugService(repos.datasource);
      const datasource = await useCase.execute(id);
      return c.json(datasource);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.post('/', async (c) => {
    try {
      const repos = await getRepositories();
      const body = await c.req.json();
      const useCase = new CreateDatasourceService(repos.datasource);
      const datasource = await useCase.execute(body);
      return c.json(datasource, 201);
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
      const useCase = new UpdateDatasourceService(repos.datasource);
      const datasource = await useCase.execute({ ...body, id });
      return c.json(datasource);
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
      const useCase = new DeleteDatasourceService(repos.datasource);
      await useCase.execute(id);
      return c.json({ success: true });
    } catch (error) {
      return handleDomainException(error);
    }
  });

  return app;
}
