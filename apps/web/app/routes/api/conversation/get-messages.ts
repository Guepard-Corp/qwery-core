import type { LoaderFunctionArgs } from 'react-router';
import { DomainException } from '@qwery/domain/exceptions';
import { GetMessagesByConversationSlugService } from '@qwery/domain/services';
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

export async function loader({ request }: LoaderFunctionArgs) {
  const repositories = await createRepositories();
  const messageRepository = repositories.message;
  const conversationRepository = repositories.conversation;

  try {
    // GET /api/messages?conversationSlug=... - Get messages by conversation slug
    const url = new URL(request.url);
    const conversationSlug = url.searchParams.get('conversationSlug');

    if (!conversationSlug) {
      return Response.json(
        { error: 'conversationSlug query parameter is required' },
        { status: 400 },
      );
    }

    // Use the service to get messages by slug
    // The service validates the conversation and gets messages
    const useCase = new GetMessagesByConversationSlugService(
      messageRepository,
      conversationRepository,
    );
    const messages = await useCase.execute({ conversationSlug });
    return Response.json(messages);
  } catch (error) {
    console.error('Error in get-messages loader:', error);
    return handleDomainException(error);
  }
}
