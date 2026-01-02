import type { ActionFunctionArgs } from 'react-router';
import {
  type UIMessage,
  FactoryAgent,
  validateUIMessages,
  detectIntent,
  PROMPT_SOURCE,
  type PromptSource,
  type NotebookCellType,
} from '@qwery/agent-factory-sdk';
import { generateConversationTitle } from '@qwery/agent-factory-sdk';
import { MessageRole } from '@qwery/domain/entities';
import { createRepositories } from '~/lib/repositories/repositories-factory';
import { handleDomainException } from '~/lib/utils/error-handler';

const agents = new Map<string, FactoryAgent>();
const agentLastAccess = new Map<string, number>();
const agentCreationLocks = new Map<string, Promise<FactoryAgent>>();

const AGENT_INACTIVITY_TIMEOUT = 30 * 60 * 1000;
const CLEANUP_INTERVAL = 5 * 60 * 1000;

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [slug, lastAccess] of agentLastAccess.entries()) {
      if (now - lastAccess > AGENT_INACTIVITY_TIMEOUT) {
        const agent = agents.get(slug);
        if (agent) {
          try {
            agent.stop();
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
  model: string = 'llama_cpp/tinyllama',
): Promise<FactoryAgent> {
  let agent = agents.get(conversationSlug);
  if (agent) {
    agentLastAccess.set(conversationSlug, Date.now());
    return agent;
  }

  const existingLock = agentCreationLocks.get(conversationSlug);
  if (existingLock) {
    return existingLock;
  }

  const creationPromise = (async () => {
    try {
      const conversation =
        await repositories.conversation.findBySlug(conversationSlug);
      if (!conversation) {
        throw new Error(
          `Conversation with slug '${conversationSlug}' not found`,
        );
      }

      agent = await FactoryAgent.create({
        conversationSlug: conversationSlug,
        model: model,
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
  const model: string = 'llama_cpp/tinyllama';  // ← Change this line
  console.log('[Chat API] ===== MODEL BEING USED:', model, '=====');
  const datasources: string[] | undefined = body.datasources;
  console.log('[Chat API] ===== MODEL BEING USED:', model, '=====');
  
  try {
    // Check if this is the first user message and title needs to be generated
    const conversation =
      await repositories.conversation.findBySlug(conversationSlug);

    // CRITICAL: Update conversation datasources if provided in request body
    // The agent uses conversation datasources, so we must update them before creating the agent
    if (datasources && datasources.length > 0 && conversation) {
      const currentDatasources = conversation.datasources || [];
      // Check if datasources are different by comparing IDs (not just count)
      // Sort both arrays to ensure consistent comparison regardless of order
      const currentSorted = [...currentDatasources].sort();
      const newSorted = [...datasources].sort();
      const datasourcesChanged =
        currentSorted.length !== newSorted.length ||
        !currentSorted.every((dsId, index) => dsId === newSorted[index]);

      if (datasourcesChanged) {
        console.log(
          `[Chat API] Updating conversation datasources from [${currentDatasources.join(', ')}] to [${datasources.join(', ')}]`,
        );

        // CRITICAL: Invalidate cached agent BEFORE updating conversation
        // This ensures the agent cache is cleared before we update the conversation
        // so the new agent will read the updated datasources
        const cachedAgent = agents.get(conversationSlug);
        if (cachedAgent) {
          try {
            // Stop the old agent
            cachedAgent.stop();
          } catch (error) {
            console.warn(`Error stopping agent ${conversationSlug}:`, error);
          }
          // Remove from cache to force recreation with new datasources
          agents.delete(conversationSlug);
          agentLastAccess.delete(conversationSlug);
          agentCreationLocks.delete(conversationSlug);
          console.log(
            `[Chat API] Invalidated cached agent for conversation ${conversationSlug} due to datasource change`,
          );
        }

        // CRITICAL: Update conversation AFTER invalidating agent cache
        // This ensures the new agent will read the updated datasources
        await repositories.conversation.update({
          ...conversation,
          datasources: datasources, // REPLACE with the provided datasources
          updatedBy: conversation.createdBy || 'system',
          updatedAt: new Date(),
        });

        // Refetch conversation to get updated datasources
        // This ensures the conversation object has the latest datasources before agent creation
        const updatedConversation =
          await repositories.conversation.findBySlug(conversationSlug);
        if (updatedConversation) {
          // Update the conversation reference for the rest of the function
          Object.assign(conversation, updatedConversation);
          console.log(
            `[Chat API] Conversation datasources updated to: [${updatedConversation.datasources?.join(', ') || 'none'}]`,
          );
        } else {
          console.warn(
            `[Chat API] Failed to refetch conversation after datasource update`,
          );
        }
      }
    }

    // CRITICAL: Compute shouldGenerateTitle AFTER all conversation updates
    // This ensures we use the latest conversation state after datasource updates
    const shouldGenerateTitle =
      conversation &&
      conversation.title === 'New Conversation' &&
      (() => {
        // This will be checked after streaming completes
        return true;
      })();

    const agent = await getOrCreateAgent(conversationSlug, model);

    // Get the last user message for intent detection
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop();
    const lastUserMessageText =
      lastUserMessage?.parts
        ?.filter((part) => part.type === 'text')
        .map((part) => (part as { text: string }).text)
        .join(' ')
        .trim() || '';

    // Always run intent detection for both inline and chat modes
    let needSQL = false;
    const isLocalLlama =
      model.includes('llama') || model.includes('llama_cpp');

    if (isLocalLlama) {
      console.log(
        '[Chat API] Skipping intent detection for local llama.cpp model:',
        model,
      );
      needSQL = false;
    } else if (lastUserMessageText) {
      try {
        console.log(
          '[Chat API] Running intent detection for:',
          lastUserMessageText.substring(0, 100),
        );
        const intentResult = await detectIntent(lastUserMessageText);
        needSQL = (intentResult as { needsSQL?: boolean }).needsSQL ?? false;
        console.log('[Chat API] Intent detection result:', {
          intent: (intentResult as { intent?: string }).intent,
          needSQL,
          needsChart: (intentResult as { needsChart?: boolean }).needsChart,
        });
      } catch (error) {
        console.warn('[Chat API] Intent detection failed:', error);
        needSQL = false;
      }
    }
    // Process messages to extract suggestion guidance and apply it internally
    // Also add datasources, promptSource, and needSQL to the last user message metadata
    const processedMessages = messages.map((message, index) => {
      // Add metadata for the last user message
      const isLastUserMessage =
        message.role === 'user' && index === messages.length - 1;

      if (isLastUserMessage) {
        // Detect if message is coming from notebook (inline mode)
        // Check if metadata has promptSource: 'inline' or notebookCellType
        const messageMetadata = (message.metadata || {}) as Record<
          string,
          unknown
        >;
        const isNotebookSource =
          messageMetadata.promptSource === PROMPT_SOURCE.INLINE ||
          messageMetadata.notebookCellType !== undefined;
        const promptSource: PromptSource = isNotebookSource
          ? PROMPT_SOURCE.INLINE
          : PROMPT_SOURCE.CHAT;
        const notebookCellType = messageMetadata.notebookCellType as
          | NotebookCellType
          | undefined;

        console.log('[Chat API] Detected prompt source:', {
          promptSource,
          notebookCellType,
          isNotebookSource,
        });

        // Build metadata - preserve notebookCellType if present, remove conflicting 'source' field
        const cleanMetadata: Record<string, unknown> = { ...messageMetadata };
        delete cleanMetadata.source; // Remove conflicting source field

        message = {
          ...message,
          metadata: {
            ...cleanMetadata,
            promptSource,
            needSQL,
            ...(notebookCellType ? { notebookCellType } : {}),
            ...(datasources && datasources.length > 0 ? { datasources } : {}),
          },
        };
      }

      if (message.role === 'user') {
        const textPart = message.parts.find((p) => p.type === 'text');
        if (textPart && 'text' in textPart) {
          const text = textPart.text;
          const guidanceMarker = '__QWERY_SUGGESTION_GUIDANCE__';
          const guidanceEndMarker = '__QWERY_SUGGESTION_GUIDANCE_END__';

          if (text.includes(guidanceMarker)) {
            // Extract guidance and clean message
            const startIndex = text.indexOf(guidanceMarker);
            const endIndex = text.indexOf(guidanceEndMarker);

            if (startIndex !== -1 && endIndex !== -1) {
              // Extract the message text (everything after the guidance marker)
              const cleanText = text
                .substring(endIndex + guidanceEndMarker.length)
                .trim();

              // Apply suggestion guidance internally by prepending it to the user message
              const suggestionGuidance = `[SUGGESTION WORKFLOW GUIDANCE]
- This is a suggested next step from a previous response - execute it directly and efficiently
- Use the provided context (previous question/answer) to understand the full conversation flow
- Be action-oriented: proceed immediately with the requested operation without asking for confirmation
- Keep your response concise and focused on delivering the requested result
- If the suggestion involves a query or analysis, execute it and present the findings clearly

User request: ${cleanText}`;

              return {
                ...message,
                parts: message.parts.map((part) => {
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

    const streamResponse = await agent.respond({
      messages: await validateUIMessages({ messages: processedMessages }),
    });

    if (!streamResponse.body) {
      return new Response(null, { status: 204 });
    }

    // Extract user message for title generation
    const firstUserMessage = messages.find((msg) => msg.role === 'user');
    const userMessageText = firstUserMessage
      ? firstUserMessage.parts
          ?.filter((part) => part.type === 'text')
          .map((part) => (part as { text: string }).text)
          .join(' ')
          .trim() || ''
      : '';

    const stream = new ReadableStream({
      async start(controller) {
        const reader = streamResponse.body!.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();

              // After stream completes, generate title if needed
              if (shouldGenerateTitle && userMessageText) {
                // Wait a bit for messages to be saved to database
                setTimeout(async () => {
                  try {
                    const existingMessages =
                      await repositories.message.findByConversationId(
                        conversation!.id,
                      );
                    const userMessages = existingMessages.filter(
                      (msg) => msg.role === MessageRole.USER,
                    );
                    const assistantMessages = existingMessages.filter(
                      (msg) => msg.role === MessageRole.ASSISTANT,
                    );

                    // Only generate if this is still the first exchange
                    if (
                      userMessages.length === 1 &&
                      assistantMessages.length === 1 &&
                      conversation!.title === 'New Conversation'
                    ) {
                      const assistantMessage = assistantMessages[0];
                      if (!assistantMessage) return;

                      // Extract text from message content (which contains UIMessage structure with parts)
                      let assistantText = '';
                      if (
                        typeof assistantMessage.content === 'object' &&
                        assistantMessage.content !== null &&
                        'parts' in assistantMessage.content &&
                        Array.isArray(assistantMessage.content.parts)
                      ) {
                        assistantText = assistantMessage.content.parts
                          .filter(
                            (part: { type?: string }) => part.type === 'text',
                          )
                          .map((part: { text?: string }) => part.text || '')
                          .join(' ')
                          .trim();
                      }

                      if (assistantText) {
                        const generatedTitle = await generateConversationTitle(
                          userMessageText,
                          assistantText,
                        );
                        if (
                          generatedTitle &&
                          generatedTitle !== 'New Conversation'
                        ) {
                          await repositories.conversation.update({
                            ...conversation!,
                            title: generatedTitle,
                            updatedBy: conversation!.createdBy,
                            updatedAt: new Date(),
                          });
                        }
                      }
                    }
                  } catch (error) {
                    console.error(
                      'Failed to generate conversation title:',
                      error,
                    );
                  }
                }, 1000); // Wait 1 second for messages to be saved
              }

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
