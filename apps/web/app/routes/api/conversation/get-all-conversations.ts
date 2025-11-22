import type { ActionFunctionArgs } from 'react-router';
import { DomainException } from '@qwery/domain/exceptions';
import { CreateConversationService } from '@qwery/domain/services';
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
  const repository = repositories.conversation;

  try {
    // GET /api/conversations - Get all conversations
    // TODO: Create GetConversationsService use case
    const conversations = await repository.findAll();
    return Response.json(conversations);
  } catch (error) {
    console.error('Error in get-all-conversations loader:', error);
    return handleDomainException(error);
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const repositories = await createRepositories();
  const repository = repositories.conversation;

  try {
    // POST /api/conversations - Create conversation
    if (request.method === 'POST') {
      const body = await request.json();
      const useCase = new CreateConversationService(repository);
      const conversation = await useCase.execute(body);
      return Response.json(conversation, { status: 201 });
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    console.error('Error in get-all-conversations action:', error);
    return handleDomainException(error);
  }
}
