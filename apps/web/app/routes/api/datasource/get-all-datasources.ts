import type { ActionFunctionArgs } from 'react-router';
import { DomainException } from '@qwery/domain/exceptions';
import { createRepositories } from '~/lib/repositories/repositories-factory';

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

export async function loader() {
  const repositories = await createRepositories();
  const repository = repositories.datasource;

  try {
    // GET /api/datasources - Get all datasources
    // TODO: Create GetDatasourcesService use case
    const datasources = await repository.findAll();
    return Response.json(datasources);
  } catch (error) {
    console.error('Error in get-all-datasources loader:', error);
    return handleDomainException(error);
  }
}

export async function action({ request }: ActionFunctionArgs) {
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

    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    console.error('Error in get-all-datasources action:', error);
    return handleDomainException(error);
  }
}
