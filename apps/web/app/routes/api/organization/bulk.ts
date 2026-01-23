import type { ActionFunctionArgs } from 'react-router';

import { DeleteOrganizationService, GetOrganizationService } from '@qwery/domain/services';

import { createRepositories } from '~/lib/repositories/repositories-factory';
import { handleDomainException } from '../_utils/http';

type BulkOrganizationOperation = 'delete' | 'export';

type BulkOrganizationRequest = {
  operation: BulkOrganizationOperation;
  ids: string[];
};

function isBulkOrganizationRequest(value: unknown): value is BulkOrganizationRequest {
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
  const repository = repositories.organization;

  try {
    const body = (await request.json()) as unknown;
    if (!isBulkOrganizationRequest(body)) {
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
      const useCase = new DeleteOrganizationService(repository);
      await Promise.all(ids.map((id) => useCase.execute(id)));
      return Response.json({ success: true, deletedCount: ids.length });
    }

    const useCase = new GetOrganizationService(repository);
    const items = await Promise.all(ids.map((id) => useCase.execute(id)));
    return Response.json({ success: true, items });
  } catch (error) {
    console.error('Error in organizations bulk action:', error);
    return handleDomainException(error);
  }
}


