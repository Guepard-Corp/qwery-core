import type { ActionFunctionArgs } from 'react-router';

import {
  DeleteProjectService,
  GetProjectService,
} from '@qwery/domain/services';

import { createRepositories } from '~/lib/repositories/repositories-factory';
import { handleDomainException } from '../_utils/http';

type BulkProjectOperation = 'delete' | 'export';

type BulkProjectRequest = {
  operation: BulkProjectOperation;
  ids: string[];
};

function isBulkProjectRequest(value: unknown): value is BulkProjectRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const v = value as Record<string, unknown>;
  if (v.operation !== 'delete' && v.operation !== 'export') {
    return false;
  }
  if (!Array.isArray(v.ids) || v.ids.some((id) => typeof id !== 'string')) {
    return false;
  }
  return true;
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const repositories = await createRepositories();
  const repository = repositories.project;

  try {
    const body = (await request.json()) as unknown;
    if (!isBulkProjectRequest(body)) {
      return Response.json(
        { error: 'Invalid request body. Expected { operation, ids }.' },
        { status: 400 },
      );
    }

    const ids = body.ids.map((id) => id.trim()).filter(Boolean);
    if (ids.length === 0) {
      return Response.json({ error: 'ids cannot be empty' }, { status: 400 });
    }

    if (body.operation === 'delete') {
      const useCase = new DeleteProjectService(repository);
      const results = await Promise.allSettled(
        ids.map((id) => useCase.execute(id)),
      );

      const deletedCount = results.filter(
        (r) => r.status === 'fulfilled',
      ).length;
      const failedIds = results
        .map((r, i) => (r.status === 'rejected' ? ids[i] : null))
        .filter((id): id is string => id !== null);

      return Response.json({
        success: deletedCount > 0,
        deletedCount,
        failedIds: failedIds.length > 0 ? failedIds : undefined,
      });
    }

    const useCase = new GetProjectService(repository);
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

    return Response.json({ success: true, items });
  } catch (error) {
    console.error('Error in projects bulk action:', error);
    return handleDomainException(error);
  }
}
