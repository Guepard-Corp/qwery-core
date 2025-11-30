import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { DomainException } from '@qwery/domain/exceptions';
import {
  DeleteNotebookService,
  GetNotebookBySlugService,
  GetNotebookService,
  UpdateNotebookService,
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

export async function loader({ params }: LoaderFunctionArgs) {
  const repositories = await createRepositories();
  const repository = repositories.notebook;

  try {
    // GET /api/notebooks/:id - Get notebook by id or slug
    if (params.id) {
      const useCase = isUUID(params.id)
        ? new GetNotebookService(repository)
        : new GetNotebookBySlugService(repository);
      const notebook = await useCase.execute(params.id);
      return Response.json(notebook);
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('Error in notebook loader:', error);
    return handleDomainException(error);
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  const repositories = await createRepositories();
  const repository = repositories.notebook;

  try {
    // PUT /api/notebooks/:id - Update notebook
    if (request.method === 'PUT' && params.id) {
      const body = await request.json();
      const useCase = new UpdateNotebookService(repository);
      const notebook = await useCase.execute({ ...body, id: params.id });
      return Response.json(notebook);
    }

    // DELETE /api/notebooks/:id - Delete notebook
    if (request.method === 'DELETE' && params.id) {
      const useCase = new DeleteNotebookService(repository);
      await useCase.execute(params.id);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    console.error('Error in notebook action:', error);
    return handleDomainException(error);
  }
}
