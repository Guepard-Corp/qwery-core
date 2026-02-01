import type { ActionFunctionArgs } from 'react-router';
import {
  type UIMessage,
  prompt,
  getDefaultModel,
} from '@qwery/agent-factory-sdk';
import { normalizeUIRole } from '@qwery/shared/message-role-utils';
import { createRepositories } from '~/lib/repositories/repositories-factory';
import { handleDomainException } from '~/lib/utils/error-handler';
import { getWebTelemetry } from '~/lib/telemetry-instance';

const repositories = await createRepositories();

export async function action({ request, params }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const conversationSlug = params.slug;
  if (!conversationSlug) {
    return new Response('Conversation slug is required', { status: 400 });
  }

  const body = await request.json();
  const messages: UIMessage[] = body.messages;
  const model: string = body.model || getDefaultModel();
  const datasources: string[] | undefined = body.datasources;

  try {
    const processedMessages = messages.map((message) => {
      if (normalizeUIRole(message.role) === 'user') {
        const textPart = message.parts?.find((p) => p.type === 'text');
        if (textPart && 'text' in textPart) {
          const text = textPart.text;
          const guidanceMarker = '__QWERY_SUGGESTION_GUIDANCE__';
          const guidanceEndMarker = '__QWERY_SUGGESTION_GUIDANCE_END__';

          if (text.includes(guidanceMarker)) {
            const endIndex = text.indexOf(guidanceEndMarker);
            if (endIndex !== -1) {
              const cleanText = text
                .substring(endIndex + guidanceEndMarker.length)
                .trim();

              const suggestionGuidance = `[SUGGESTION WORKFLOW GUIDANCE]
- This is a suggested next step from a previous response - execute it directly and efficiently
- Use the provided context (previous question/answer) to understand the full conversation flow
- Be action-oriented: proceed immediately with the requested operation without asking for confirmation
- Keep your response concise and focused on delivering the requested result
- If the suggestion involves a query or analysis, execute it and present the findings clearly

User request: ${cleanText}`;

              return {
                ...message,
                parts: message.parts?.map((part) => {
                  if (part.type === 'text' && 'text' in part) {
                    return { ...part, text: suggestionGuidance };
                  }
                  return part;
                }),
              };
            }
          }
        }
      }
      return message;
    });

    const telemetry = await getWebTelemetry();

    const response = await prompt({
      conversationSlug,
      messages: processedMessages,
      model,
      datasources,
      repositories,
      telemetry,
      generateTitle: true,
    });

    return response;
  } catch (error) {
    return handleDomainException(error);
  }
}
