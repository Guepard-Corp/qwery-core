import { ChatTransport, UIMessage, UIMessageChunk } from 'ai';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import {
  createLangGraphAgent,
  type LangGraphAgentOptions,
  type AgentState,
} from './langgraph-agent';

export interface LangGraphTransportOptions extends LangGraphAgentOptions {
  maxIterations?: number;
}

/**
 * ChatTransport adapter that wraps a LangGraph agent and streams execution
 * to Vercel AI SDK UI components.
 */
export class LangGraphTransport<UI_MESSAGE extends UIMessage>
  implements ChatTransport<UI_MESSAGE>
{
  private agentOptions: LangGraphAgentOptions;
  private maxIterations: number;

  constructor(options: LangGraphTransportOptions = {}) {
    const { maxIterations = 10, ...agentOptions } = options;
    this.agentOptions = agentOptions;
    this.maxIterations = maxIterations;
  }

  async sendMessages({
    trigger: _trigger,
    chatId: _chatId,
    messageId,
    messages,
    abortSignal,
    body,
  }: Parameters<ChatTransport<UI_MESSAGE>['sendMessages']>[0]): Promise<
    ReadableStream<UIMessageChunk>
  > {
    const messageIdGenerated =
      messageId || `msg-${Date.now()}-${Math.random()}`;
    const model = (body as { model?: string })?.model;

    // Create agent with tools
    const { app } = createLangGraphAgent({
      ...this.agentOptions,
      model: model || this.agentOptions.model,
    });

    // Convert UI messages to LangChain messages
    const langchainMessages: BaseMessage[] = [];
    // Track the last assistant message content to filter out duplicates
    let lastAssistantMessageContent = '';
    for (const msg of messages) {
      const textParts = msg.parts
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join('\n');

      if (textParts) {
        if (msg.role === 'user') {
          langchainMessages.push(new HumanMessage(textParts));
        } else if (msg.role === 'assistant') {
          langchainMessages.push(new AIMessage(textParts));
          // Track the last assistant message content
          lastAssistantMessageContent = textParts;
        }
      }
    }

    const maxIterations = this.maxIterations;
    const stream = new ReadableStream<UIMessageChunk>({
      async start(controller) {
        try {
          // Emit start chunk
          controller.enqueue({
            type: 'start',
            messageId: messageIdGenerated,
          } as UIMessageChunk);

          // Emit text-start chunk
          controller.enqueue({
            type: 'text-start',
            id: messageIdGenerated,
          } as UIMessageChunk);

          let iterationCount = 0;
          let accumulatedText = '';
          let emittedText = ''; // Track what we've actually emitted to the UI
          const currentToolCalls: Map<
            string,
            { toolName: string; args: unknown; state: string }
          > = new Map();

          const emitDelta = (delta: string) => {
            if (!delta) {
              return;
            }
            for (const char of delta) {
              controller.enqueue({
                type: 'text-delta',
                delta: char,
                id: messageIdGenerated,
              } as UIMessageChunk);
            }
          };

          // Try to stream LangGraph execution, but fallback to invoke if streaming fails
          let streamed = false;

          try {
            // Stream LangGraph execution
            const streamEvents = app.streamEvents(
              { messages: langchainMessages },
              { version: 'v2' },
            );

            for await (const event of streamEvents) {
              streamed = true;
              if (abortSignal?.aborted) {
                controller.close();
                return;
              }

              // Handle LLM streaming (text generation)
              if (event.event === 'on_llm_stream' && event.data?.chunk) {
                const content = event.data.chunk.content;
                if (content) {
                  accumulatedText += content;

                  // Check if we're duplicating the previous assistant message
                  if (
                    lastAssistantMessageContent &&
                    accumulatedText.startsWith(lastAssistantMessageContent)
                  ) {
                    // We're in duplicate territory
                    if (
                      accumulatedText.length <=
                      lastAssistantMessageContent.length
                    ) {
                      // Still within the duplicate, don't emit anything
                      continue;
                    } else {
                      // We've passed the duplicate, calculate what new content to emit
                      const newContent = accumulatedText.slice(
                        lastAssistantMessageContent.length,
                      );
                      const newDelta = newContent.slice(emittedText.length);
                      if (newDelta) {
                        emitDelta(newDelta);
                        emittedText = newContent;
                        accumulatedText = newContent;
                      }
                      continue;
                    }
                  }

                  // No duplicate detected, emit normally
                  emitDelta(content);
                  emittedText += content;
                }
              }

              // Handle LLM end (full response)
              if (event.event === 'on_llm_end' && event.data?.output) {
                const output = event.data.output;

                // Store the AI message for later use
                if (output instanceof AIMessage) {
                  // If there's text content, check for duplicates
                  if (output.content && typeof output.content === 'string') {
                    const content = output.content;

                    // Filter out the previous assistant message if it's included
                    let newContent = content;
                    if (
                      lastAssistantMessageContent &&
                      content.startsWith(lastAssistantMessageContent)
                    ) {
                      newContent = content.slice(
                        lastAssistantMessageContent.length,
                      );
                    }

                    const delta = newContent.slice(emittedText.length);
                    if (delta) {
                      emitDelta(delta);
                    }
                    accumulatedText = newContent;
                    emittedText = newContent;
                  }
                }

                // Check for tool calls
                if (output.tool_calls && output.tool_calls.length > 0) {
                  for (const toolCall of output.tool_calls) {
                    const toolCallId =
                      toolCall.id || `tool-${Date.now()}-${Math.random()}`;
                    currentToolCalls.set(toolCallId, {
                      toolName: toolCall.name,
                      args: toolCall.args,
                      state: 'input-available',
                    });

                    // Emit tool part with input-available state
                    controller.enqueue({
                      type: `tool-${toolCallId}` as const,
                      toolCallId,
                      toolName: toolCall.name,
                      state: 'input-available',
                      input: toolCall.args,
                    } as unknown as UIMessageChunk);
                  }
                }
              }

              // Handle tool execution start
              if (
                event.event === 'on_tool_start' &&
                (event.data as { name?: string })?.name
              ) {
                const toolName = (event.data as { name: string }).name;
                const toolCallId = Array.from(currentToolCalls.keys()).find(
                  (id) => currentToolCalls.get(id)?.toolName === toolName,
                );

                if (toolCallId) {
                  currentToolCalls.set(toolCallId, {
                    ...currentToolCalls.get(toolCallId)!,
                    state: 'input-available',
                  });

                  controller.enqueue({
                    type: `tool-${toolCallId}` as const,
                    toolCallId,
                    toolName,
                    state: 'input-available',
                    input: currentToolCalls.get(toolCallId)?.args,
                  } as unknown as UIMessageChunk);
                }
              }

              // Handle tool execution end
              if (
                event.event === 'on_tool_end' &&
                (event.data as { output?: unknown })?.output
              ) {
                const toolName = (event.data as { name: string }).name;
                const output = (event.data as { output: unknown }).output;
                const toolCallId = Array.from(currentToolCalls.keys()).find(
                  (id) => currentToolCalls.get(id)?.toolName === toolName,
                );

                if (toolCallId) {
                  const parsedOutput =
                    typeof output === 'string'
                      ? output
                      : JSON.stringify(output);

                  controller.enqueue({
                    type: `tool-${toolCallId}` as const,
                    toolCallId,
                    toolName,
                    state: 'output-available',
                    input: currentToolCalls.get(toolCallId)?.args,
                    output: parsedOutput,
                  } as unknown as UIMessageChunk);

                  currentToolCalls.delete(toolCallId);
                }
              }

              // Handle tool errors
              if (
                event.event === 'on_tool_error' &&
                (event.data as { error?: unknown })?.error
              ) {
                const toolName = (event.data as { name: string }).name;
                const error = (event.data as { error: unknown }).error;
                const toolCallId = Array.from(currentToolCalls.keys()).find(
                  (id) => currentToolCalls.get(id)?.toolName === toolName,
                );

                if (toolCallId) {
                  const errorMessage =
                    error instanceof Error ? error.message : String(error);

                  controller.enqueue({
                    type: `tool-${toolCallId}` as const,
                    toolCallId,
                    toolName,
                    state: 'output-error',
                    input: currentToolCalls.get(toolCallId)?.args,
                    errorText: errorMessage,
                  } as unknown as UIMessageChunk);

                  currentToolCalls.delete(toolCallId);
                }
              }

              // Track iterations
              if (event.event === 'on_chain_start' && event.name === 'agent') {
                iterationCount++;
                if (iterationCount > maxIterations) {
                  controller.enqueue({
                    type: 'error',
                    errorText: `Maximum iterations (${maxIterations}) reached`,
                  } as UIMessageChunk);
                  break;
                }
              }

              // Handle chain end - extract final response
              if (event.event === 'on_chain_end' && event.data?.output) {
                const finalState = event.data.output as AgentState;
                if (finalState?.messages) {
                  // Find the last AI message that has text content
                  for (let i = finalState.messages.length - 1; i >= 0; i--) {
                    const msg = finalState.messages[i];
                    if (msg instanceof AIMessage && msg.content) {
                      const content =
                        typeof msg.content === 'string'
                          ? msg.content
                          : Array.isArray(msg.content)
                            ? msg.content
                                .map((c) => (typeof c === 'string' ? c : ''))
                                .join('')
                            : '';

                      // Filter out the previous assistant message if it's included
                      let newContent = content;
                      if (
                        lastAssistantMessageContent &&
                        content.startsWith(lastAssistantMessageContent)
                      ) {
                        // The LLM included the previous message, extract only the new part
                        newContent = content.slice(
                          lastAssistantMessageContent.length,
                        );
                      }

                      // Only emit if we haven't already emitted this content
                      if (newContent && newContent !== emittedText) {
                        const toEmit = newContent.slice(emittedText.length);
                        if (toEmit) {
                          emitDelta(toEmit);
                          accumulatedText = newContent;
                          emittedText = newContent;
                        }
                      }
                      break;
                    }
                  }
                }
              }
            }
          } catch (streamError) {
            // If streaming fails, fall back to invoke
            console.warn(
              'Streaming failed, falling back to invoke:',
              streamError,
            );
          }

          // If streaming didn't work or no text was accumulated, use invoke as fallback
          if (!streamed || !accumulatedText) {
            try {
              const finalState = await app.invoke({
                messages: langchainMessages,
              });
              if (finalState?.messages) {
                // Find the last AI message with text content
                for (let i = finalState.messages.length - 1; i >= 0; i--) {
                  const msg = finalState.messages[i];
                  if (msg instanceof AIMessage && msg.content) {
                    const content =
                      typeof msg.content === 'string'
                        ? msg.content
                        : Array.isArray(msg.content)
                          ? msg.content
                              .map((c) => (typeof c === 'string' ? c : ''))
                              .join('')
                          : '';

                    // Filter out the previous assistant message if it's included
                    let newContent = content;
                    if (
                      lastAssistantMessageContent &&
                      content.startsWith(lastAssistantMessageContent)
                    ) {
                      // The LLM included the previous message, extract only the new part
                      newContent = content.slice(
                        lastAssistantMessageContent.length,
                      );
                    }

                    // Only emit if we haven't already emitted this content
                    if (newContent && newContent !== emittedText) {
                      const toEmit = newContent.slice(emittedText.length);
                      if (toEmit) {
                        emitDelta(toEmit);
                        accumulatedText = newContent;
                        emittedText = newContent;
                      }
                    }
                    break;
                  }
                }
              }
            } catch (invokeError) {
              controller.enqueue({
                type: 'error',
                errorText:
                  invokeError instanceof Error
                    ? invokeError.message
                    : 'Failed to get response from agent',
              } as UIMessageChunk);
            }
          }

          // Emit final text-end if we have accumulated text
          if (emittedText) {
            controller.enqueue({
              type: 'text-end',
              id: messageIdGenerated,
            } as UIMessageChunk);
          }

          // Emit finish chunk
          controller.enqueue({
            type: 'finish',
            finishReason: 'stop',
          } as UIMessageChunk);

          controller.close();
        } catch (error) {
          controller.enqueue({
            type: 'error',
            errorText:
              error instanceof Error ? error.message : 'Unknown error occurred',
          } as UIMessageChunk);
          controller.close();
        }
      },
    });

    return stream;
  }

  async reconnectToStream({
    chatId: _chatId,
  }: Parameters<
    ChatTransport<UI_MESSAGE>['reconnectToStream']
  >[0]): Promise<ReadableStream<UIMessageChunk> | null> {
    // Browser-based transport doesn't support reconnection
    return null;
  }
}
