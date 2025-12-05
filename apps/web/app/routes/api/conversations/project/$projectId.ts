import type { LoaderFunctionArgs } from 'react-router';
import { DomainException } from '@qwery/domain/exceptions';
import { GetConversationsByProjectIdService } from '@qwery/domain/services';
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

export async function loader({ params }: LoaderFunctionArgs) {
  const repositories = await createRepositories();
  const repository = repositories.conversation;

  try {
    // GET /api/conversations/project/:projectId - Get conversations by project ID
    const projectId = params.projectId;
    if (!projectId) {
      return Response.json(
        { error: 'Project ID is required' },
        { status: 400 },
      );
    }

    const useCase = new GetConversationsByProjectIdService(repository);
    const conversations = await useCase.execute(projectId);
    return Response.json(conversations);
  } catch (error) {
    console.error('Error in get-conversations-by-project loader:', error);
    return handleDomainException(error);
  }
}

