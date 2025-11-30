import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import {
  DeleteOrganizationService,
  GetOrganizationBySlugService,
  GetOrganizationService,
  UpdateOrganizationService,
} from '@qwery/domain/services';
import { createRepositories } from '~/lib/repositories/repositories-factory';
import { DomainException } from '@qwery/domain/exceptions';

function isUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function handleDomainException(error: unknown): Response {
  if (error instanceof DomainException) {
    const status =
      error.code >= 2000 && error.code < 3000
        ? 404
        : error.code >= 400 && error.code < 500
          ? error.code
          : 500;
    return Response.json(
      {
        error: error.message,
        code: error.code,
        data: error.data,
      },
      { status },
    );
  }
  const errorMessage =
    error instanceof Error ? error.message : 'Internal server error';
  return Response.json({ error: errorMessage }, { status: 500 });
}

export async function loader({ params }: LoaderFunctionArgs) {
  const repositories = await createRepositories();
  const repository = repositories.organization;

  try {
    // GET /api/organizations/:id - Get organization by id or slug
    if (params.id) {
      const useCase = isUUID(params.id)
        ? new GetOrganizationService(repository)
        : new GetOrganizationBySlugService(repository);
      const organization = await useCase.execute(params.id);
      return Response.json(organization);
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('Error in organization loader:', error);
    return handleDomainException(error);
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  const repositories = await createRepositories();
  const repository = repositories.organization;

  try {
    // PUT /api/organizations/:id - Update organization
    if (request.method === 'PUT' && params.id) {
      const body = await request.json();
      const useCase = new UpdateOrganizationService(repository);
      const organization = await useCase.execute({ ...body, id: params.id });
      return Response.json(organization);
    }

    // DELETE /api/organizations/:id - Delete organization
    if (request.method === 'DELETE' && params.id) {
      const useCase = new DeleteOrganizationService(repository);
      await useCase.execute(params.id);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    console.error('Error in organization action:', error);
    return handleDomainException(error);
  }
}
