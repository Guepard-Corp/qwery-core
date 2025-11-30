'use server';

import type { ActionFunctionArgs } from 'react-router';
import {
  type UIMessage,
  FactoryAgent,
  validateUIMessages,
} from '@qwery/agent-factory-sdk';
import {} from '@qwery/agent-factory-sdk';
import { createRepositories } from '~/lib/repositories/repositories-factory';

// Map to persist manager agent instances by conversation slug
const agents = new Map<string, FactoryAgent>();

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

  // Get or create manager agent for this conversation
  let agent = agents.get(conversationSlug);
  if (!agent) {
    agent = new FactoryAgent({
      conversationSlug: conversationSlug,
      repositories: repositories,
    });
    agents.set(conversationSlug, agent);
    console.log(
      `Agent ${agent.id} created for conversation ${conversationSlug}`,
    );
  }

  //const agent = managerAgent.getAgent();
  const streamResponse = await agent.respond({
    messages: await validateUIMessages({ messages }),
  });

  if (!streamResponse.body) {
    return new Response(null, { status: 204 });
  }

  // Create a ReadableStream that forwards chunks from the manager agent
  const stream = new ReadableStream({
    async start(controller) {
      const reader = streamResponse.body!.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          controller.enqueue(new TextEncoder().encode(chunk));
        }
      } catch (error) {
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
