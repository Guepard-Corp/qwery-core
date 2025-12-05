'use server';

import type { ActionFunctionArgs } from 'react-router';
import { createRepositories } from '~/lib/repositories/repositories-factory';
import { handleDomainException } from '~/lib/utils/error-handler';
import { Message } from '@qwery/domain/entities';

export async function action({ request, params }: ActionFunctionArgs) {
  if (request.method !== 'PUT' && request.method !== 'PATCH') {
    return new Response('Method not allowed', { status: 405 });
  }

  const messageId = params.id;
  if (!messageId) {
    return new Response('Message ID is required', { status: 400 });
  }

  try {
    const repositories = await createRepositories();
    const body = await request.json();
    const { content, updatedBy = 'user' } = body;

    if (!content) {
      return new Response('Content is required', { status: 400 });
    }

    // Find existing message
    const existingMessage = await repositories.message.findById(messageId);
    if (!existingMessage) {
      return new Response('Message not found', { status: 404 });
    }

    // Update message with new content
    // Convert UIMessage content format to Message content format
    const updatedContent =
      typeof content === 'string'
        ? { text: content }
        : typeof content === 'object' && content !== null && 'parts' in content
          ? content
          : content;

    const updatedMessage = {
      ...existingMessage,
      content: updatedContent,
      updatedAt: new Date(),
      updatedBy,
    };

    const result = await repositories.message.update(
      updatedMessage as unknown as Message,
    );

    return Response.json({
      id: result.id,
      content: result.content,
      updatedAt: result.updatedAt,
    });
  } catch (error) {
    console.error('Error updating message:', error);
    return handleDomainException(error);
  }
}

