import type { ActionFunctionArgs } from 'react-router';
import { type UIMessage, ManagerAgent } from '@qwery/agent-factory-sdk';

// Map to persist manager agent instances by conversation slug
const managerAgents = new Map<string, ManagerAgent>();

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

  console.log(JSON.stringify(messages, null, 2));

  // Get or create manager agent for this conversation
  let managerAgent = managerAgents.get(conversationSlug);
  if (!managerAgent) {
    managerAgent = new ManagerAgent({ conversationId: conversationSlug });
    managerAgents.set(conversationSlug, managerAgent);
  }

  const agent = managerAgent.getAgent();
  const streamResponse = await agent.getStreamResponse(messages, 'start');

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
