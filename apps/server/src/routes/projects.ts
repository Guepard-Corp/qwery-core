import { Hono } from 'hono';
import { ProjectOutput } from '@qwery/domain/usecases';
import {
  CreateProjectService,
  DeleteProjectService,
  GetProjectBySlugService,
  GetProjectService,
  GetProjectsByOrganizationIdService,
  UpdateProjectService,
} from '@qwery/domain/services';
import type { Repositories } from '@qwery/domain/repositories';
import {
  handleDomainException,
  parseLimit,
  parsePositiveInt,
  isUUID,
} from '../lib/http-utils';

type BulkProjectOperation = 'delete' | 'export';

type BulkProjectRequest = {
  operation: BulkProjectOperation;
  ids: string[];
};

function isBulkProjectRequest(value: unknown): value is BulkProjectRequest {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (v.operation !== 'delete' && v.operation !== 'export') return false;
  if (!Array.isArray(v.ids) || v.ids.some((id) => typeof id !== 'string'))
    return false;
  return true;
}

export function createProjectsRoutes(
  getRepositories: () => Promise<Repositories>,
) {
  const app = new Hono();

  app.get('/', async (c) => {
    try {
      const repos = await getRepositories();
      const orgId = c.req.query('orgId');
      const q = (c.req.query('q') ?? '').trim().toLowerCase();
      const offset = parsePositiveInt(c.req.query('offset') ?? null, 0) ?? 0;
      const limit = parseLimit(c.req.query('limit') ?? null, 0, 200);

      if (!orgId) {
        return c.json({ error: 'Organization ID is required' }, 400);
      }

      const useCase = new GetProjectsByOrganizationIdService(repos.project);
      const projects = await useCase.execute(orgId);

      const filtered = q
        ? projects.filter((project) => {
            const name = project.name?.toLowerCase() ?? '';
            const slug = project.slug?.toLowerCase() ?? '';
            const description = project.description?.toLowerCase() ?? '';
            return (
              name.includes(q) || slug.includes(q) || description.includes(q)
            );
          })
        : projects;

      const paginated =
        limit > 0
          ? filtered.slice(offset, offset + limit)
          : filtered.slice(offset);

      return c.json(paginated);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.post('/', async (c) => {
    try {
      const repos = await getRepositories();
      const body = await c.req.json();
      const useCase = new CreateProjectService(repos.project);
      const project = await useCase.execute(body);
      return c.json(project, 201);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.get('/search', async (c) => {
    try {
      const repos = await getRepositories();
      const q = (c.req.query('q') ?? '').trim().toLowerCase();
      const orgId = (c.req.query('orgId') ?? '').trim();
      const limit = parseLimit(c.req.query('limit') ?? null, 10, 50);
      const offset = parsePositiveInt(c.req.query('offset') ?? null, 0) ?? 0;

      const projects = orgId
        ? await new GetProjectsByOrganizationIdService(repos.project).execute(
            orgId,
          )
        : (await repos.project.findAll()).map((p) => ProjectOutput.new(p));

      const filtered = q
        ? projects.filter((project) => {
            const name = project.name?.toLowerCase() ?? '';
            const slug = project.slug?.toLowerCase() ?? '';
            const description = project.description?.toLowerCase() ?? '';
            return (
              name.includes(q) || slug.includes(q) || description.includes(q)
            );
          })
        : projects;

      return c.json({
        results: filtered.slice(offset, offset + limit),
        total: filtered.length,
      });
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.post('/bulk', async (c) => {
    try {
      const repos = await getRepositories();
      const body = (await c.req.json()) as unknown;
      if (!isBulkProjectRequest(body)) {
        return c.json(
          { error: 'Invalid request body. Expected { operation, ids }.' },
          400,
        );
      }

      const ids = body.ids.map((id: string) => id.trim()).filter(Boolean);
      if (ids.length === 0) {
        return c.json({ error: 'ids cannot be empty' }, 400);
      }

      if (body.operation === 'delete') {
        const useCase = new DeleteProjectService(repos.project);
        const results = await Promise.allSettled(
          ids.map((id) => useCase.execute(id)),
        );
        const deletedCount = results.filter(
          (r) => r.status === 'fulfilled',
        ).length;
        const failedIds = results
          .map((r, i) => (r.status === 'rejected' ? ids[i] : null))
          .filter((id): id is string => id !== null);
        return c.json({
          success: deletedCount > 0,
          deletedCount,
          failedIds: failedIds.length > 0 ? failedIds : undefined,
        });
      }

      const useCase = new GetProjectService(repos.project);
      const results = await Promise.allSettled(
        ids.map((id) => useCase.execute(id)),
      );
      const items = results
        .filter(
          (
            r,
          ): r is PromiseFulfilledResult<
            Awaited<ReturnType<typeof useCase.execute>>
          > => r.status === 'fulfilled',
        )
        .map((r) => r.value);
      return c.json({ success: true, items });
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.get('/:id', async (c) => {
    try {
      const id = c.req.param('id');
      if (!id) return c.json({ error: 'Not found' }, 404);

      const repos = await getRepositories();
      const useCase = isUUID(id)
        ? new GetProjectService(repos.project)
        : new GetProjectBySlugService(repos.project);
      const project = await useCase.execute(id);
      return c.json(project);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.put('/:id', async (c) => {
    try {
      const id = c.req.param('id');
      if (!id) return c.json({ error: 'Method not allowed' }, 405);

      const repos = await getRepositories();
      const body = await c.req.json();
      const useCase = new UpdateProjectService(repos.project);
      const project = await useCase.execute({ ...body, id });
      return c.json(project);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.delete('/:id', async (c) => {
    try {
      const id = c.req.param('id');
      if (!id) return c.json({ error: 'Method not allowed' }, 405);

      const repos = await getRepositories();
      const useCase = new DeleteProjectService(repos.project);
      await useCase.execute(id);
      return c.json({ success: true });
    } catch (error) {
      return handleDomainException(error);
    }
  });

  return app;
}
