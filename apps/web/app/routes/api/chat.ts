import type { ActionFunctionArgs } from 'react-router';
import {
  type UIMessage,
  FactoryAgent,
  validateUIMessages,
} from '@qwery/agent-factory-sdk';
import {} from '@qwery/agent-factory-sdk';
import { createRepositories } from '~/lib/repositories/repositories-factory';
import { handleDomainException } from '~/lib/utils/error-handler';

// Map to persist manager agent instances by conversation slug
const agents = new Map<string, FactoryAgent>();
// Track last access time for cleanup
const agentLastAccess = new Map<string, number>();
// Lock map to prevent race conditions during agent creation
const agentCreationLocks = new Map<string, Promise<FactoryAgent>>();

// Cleanup interval: remove agents inactive for 30 minutes
const AGENT_INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000; // Run cleanup every 5 minutes

// Start cleanup interval
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [slug, lastAccess] of agentLastAccess.entries()) {
      if (now - lastAccess > AGENT_INACTIVITY_TIMEOUT) {
        const agent = agents.get(slug);
        if (agent) {
          // Stop the actor to clean up resources
          try {
            (agent as any).factoryActor?.stop();
          } catch (error) {
            console.warn(`Error stopping agent ${slug}:`, error);
          }
          agents.delete(slug);
          agentLastAccess.delete(slug);
          agentCreationLocks.delete(slug);
          console.log(`Cleaned up inactive agent for conversation ${slug}`);
        }
      }
    }
  }, CLEANUP_INTERVAL);
}

const repositories = await createRepositories();

async function getOrCreateAgent(
  conversationSlug: string,
): Promise<FactoryAgent> {
  // Check if agent already exists
  let agent = agents.get(conversationSlug);
  if (agent) {
    agentLastAccess.set(conversationSlug, Date.now());
    return agent;
  }

  // Check if agent is being created (prevent race conditions)
  const existingLock = agentCreationLocks.get(conversationSlug);
  if (existingLock) {
    return existingLock;
  }

  // Create new agent with lock
  const creationPromise = (async () => {
    try {
      // Validate conversation exists before creating agent
      const conversation = await repositories.conversation.findBySlug(
        conversationSlug,
      );
      if (!conversation) {
        throw new Error(
          `Conversation with slug '${conversationSlug}' not found`,
        );
      }

      // Create agent using factory method (resolves slug to ID)
      agent = await FactoryAgent.create({
        conversationSlug: conversationSlug,
        repositories: repositories,
      });

      agents.set(conversationSlug, agent);
      agentLastAccess.set(conversationSlug, Date.now());
      agentCreationLocks.delete(conversationSlug);
      console.log(
        `Agent ${agent.id} created for conversation ${conversationSlug}`,
      );
      return agent;
    } catch (error) {
      agentCreationLocks.delete(conversationSlug);
      throw error;
    }
  })();

  agentCreationLocks.set(conversationSlug, creationPromise);
  return creationPromise;
}

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

  try {
    // Get or create manager agent for this conversation
    const agent = await getOrCreateAgent(conversationSlug);

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
  } catch (error) {
    return handleDomainException(error);
  }
}
