import { Hono } from 'hono';
import {
  CreateOrganizationService,
  DeleteOrganizationService,
  GetOrganizationBySlugService,
  GetOrganizationService,
  GetOrganizationsService,
  UpdateOrganizationService,
} from '@qwery/domain/services';
import type { Repositories } from '@qwery/domain/repositories';
import {
  handleDomainException,
  parseLimit,
  parsePositiveInt,
  isUUID,
} from '../lib/http-utils';

type BulkOrganizationOperation = 'delete' | 'export';

type BulkOrganizationRequest = {
  operation: BulkOrganizationOperation;
  ids: string[];
};

function isBulkOrganizationRequest(
  value: unknown,
): value is BulkOrganizationRequest {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (v.operation !== 'delete' && v.operation !== 'export') return false;
  if (!Array.isArray(v.ids) || v.ids.some((id) => typeof id !== 'string'))
    return false;
  return true;
}

export function createOrganizationsRoutes(
  getRepositories: () => Promise<Repositories>,
) {
  const app = new Hono();

  app.get('/', async (c) => {
    try {
      const repos = await getRepositories();
      const q = (c.req.query('q') ?? '').trim().toLowerCase();
      const offset = parsePositiveInt(c.req.query('offset') ?? null, 0) ?? 0;
      const limit = parseLimit(c.req.query('limit') ?? null, 0, 200);

      const useCase = new GetOrganizationsService(repos.organization);
      const organizations = await useCase.execute();

      const filtered = q
        ? organizations.filter((org) => {
            const name = org.name?.toLowerCase() ?? '';
            const slug = org.slug?.toLowerCase() ?? '';
            return name.includes(q) || slug.includes(q);
          })
        : organizations;

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
      const useCase = new CreateOrganizationService(repos.organization);
      const organization = await useCase.execute(body);
      return c.json(organization, 201);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.get('/search', async (c) => {
    try {
      const repos = await getRepositories();
      const q = (c.req.query('q') ?? '').trim().toLowerCase();
      const limit = parseLimit(c.req.query('limit') ?? null, 10, 50);
      const offset = parsePositiveInt(c.req.query('offset') ?? null, 0) ?? 0;

      const useCase = new GetOrganizationsService(repos.organization);
      const organizations = await useCase.execute();

      const filtered = q
        ? organizations.filter((org) => {
            const name = org.name?.toLowerCase() ?? '';
            const slug = org.slug?.toLowerCase() ?? '';
            return name.includes(q) || slug.includes(q);
          })
        : organizations;

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
      if (!isBulkOrganizationRequest(body)) {
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
        const useCase = new DeleteOrganizationService(repos.organization);
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

      const useCase = new GetOrganizationService(repos.organization);
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
        ? new GetOrganizationService(repos.organization)
        : new GetOrganizationBySlugService(repos.organization);
      const organization = await useCase.execute(id);
      return c.json(organization);
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
      const useCase = new UpdateOrganizationService(repos.organization);
      const organization = await useCase.execute({ ...body, id });
      return c.json(organization);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.delete('/:id', async (c) => {
    try {
      const id = c.req.param('id');
      if (!id) return c.json({ error: 'Method not allowed' }, 405);

      const repos = await getRepositories();
      const useCase = new DeleteOrganizationService(repos.organization);
      await useCase.execute(id);
      return c.json({ success: true });
    } catch (error) {
      return handleDomainException(error);
    }
  });

  return app;
}
