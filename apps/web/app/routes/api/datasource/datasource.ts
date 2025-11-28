import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { DomainException } from '@qwery/domain/exceptions';
import {
  DeleteDatasourceService,
  GetDatasourceBySlugService,
  GetDatasourceService,
  UpdateDatasourceService,
} from '@qwery/domain/services';
import { createRepositories } from '~/lib/repositories/repositories-factory';

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

export async function loader({ request, params }: LoaderFunctionArgs) {
  const repositories = await createRepositories();
  const repository = repositories.datasource;

  try {
    // GET /api/datasources/:id - Get datasource by id or slug
    if (params.id) {
      const useCase = isUUID(params.id)
        ? new GetDatasourceService(repository)
        : new GetDatasourceBySlugService(repository);
      const datasource = await useCase.execute(params.id);
      return Response.json(datasource);
    }

    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');

    if (projectId) {
      const datasources = await repository.findByProjectId(projectId);
      return Response.json(datasources ?? []);
    }

    const datasources = await repository.findAll();
    return Response.json(datasources);
  } catch (error) {
    console.error('Error in datasource loader:', error);
    return handleDomainException(error);
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  const repositories = await createRepositories();
  const repository = repositories.datasource;

  try {
    // POST /api/datasources - Create datasource
    if (request.method === 'POST') {
      // TODO: Create CreateDatasourceService use case
      const body = await request.json();
      const datasource = await repository.create(body);
      return Response.json(datasource, { status: 201 });
    }

    // PUT /api/datasources/:id - Update datasource
    if (request.method === 'PUT' && params.id) {
      const body = await request.json();
      const useCase = new UpdateDatasourceService(repository);
      const datasource = await useCase.execute({ ...body, id: params.id });
      return Response.json(datasource);
    }

    // DELETE /api/datasources/:id - Delete datasource
    if (request.method === 'DELETE' && params.id) {
      const useCase = new DeleteDatasourceService(repository);
      await useCase.execute(params.id);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    console.error('Error in datasource action:', error);
    return handleDomainException(error);
  }
}
