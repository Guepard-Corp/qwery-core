import { LanguageModel } from 'ai';

type ModelProvider = {
  resolveModel: (modelName: string) => LanguageModel;
};

export type LlamaCppModelProviderOptions = {
  baseURL?: string;
  defaultModel?: string;
};

type LlamaPromptMessage = {
  role: 'system' | 'user' | 'assistant';
  content: unknown;
};

type LlamaMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type LlamaPrompt = {
  system?: string;
  messages: LlamaPromptMessage[];
};

// Streaming payload types from llama.cpp (OpenAI-compatible)
type LlamaCompletionStreamDelta = {
  content?: string;
  role?: 'system' | 'user' | 'assistant';
};

type LlamaCompletionStreamMessage = {
  content?: string;
  role?: 'system' | 'user' | 'assistant';
};

type LlamaCompletionStreamChoice = {
  delta?: LlamaCompletionStreamDelta;
  message?: LlamaCompletionStreamMessage;
  finish_reason?: string | null;
};

type LlamaCompletionStreamChunk = {
  id?: string;
  choices?: LlamaCompletionStreamChoice[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

const isTextSegment = (value: unknown): value is { text?: string } =>
  typeof value === 'object' &&
  value !== null &&
  'text' in value &&
  typeof (value as { text?: unknown }).text === 'string';

const hasContentString = (value: unknown): value is { content: string } =>
  typeof value === 'object' &&
  value !== null &&
  'content' in value &&
  typeof (value as { content?: unknown }).content === 'string';

const toLlamaMessages = (prompt: LlamaPrompt): LlamaMessage[] => {
  const out: LlamaMessage[] = [];

  const extractText = (content: unknown): string => {
    // Handle string content
    if (typeof content === 'string') {
      // FIX: Check if it's a JSON string that needs parsing (e.g., '[{"type":"text","text":"..."}]')
      const trimmed = content.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            // Recursively extract text from parsed array
            const extracted = extractText(parsed);
            console.log(`[toLlamaMessages] Extracted text from JSON string: "${extracted.substring(0, 100)}"`);
            return extracted;
          }
        } catch (error) {
          // Not valid JSON or parsing failed, return as-is
          console.warn('[toLlamaMessages] Failed to parse JSON string:', error);
        }
      }
      return content;
    }
    
    // Handle array content
    if (Array.isArray(content)) {
      return content
        .map((segment) => {
          if (typeof segment === 'string') return segment;
          if (isTextSegment(segment) && typeof segment.text === 'string')
            return segment.text;
          if (hasContentString(segment)) return segment.content;
          return '';
        })
        .filter(Boolean)
        .join('');
    }
    
    // Handle object with content property
    if (hasContentString(content)) return content.content;
    
    return '';
  };

  if (prompt.system && typeof prompt.system === 'string') {
    out.push({ role: 'system', content: prompt.system });
  }

  // Defensive check: ensure messages is iterable
  if (Array.isArray(prompt.messages)) {
    for (const msg of prompt.messages) {
      const extracted = extractText(msg.content);
      console.log(`[toLlamaMessages] Converting message: role=${msg.role}, originalContentType=${typeof msg.content}, originalContentPreview="${String(msg.content).substring(0, 200)}", extracted="${extracted.substring(0, 200)}"`);
      
      // FIX: Merge consecutive messages with the same role to satisfy llama.cpp strict alternation
      if (out.length > 0) {
        const lastMsg = out[out.length - 1];
        if (lastMsg && lastMsg.role === msg.role) {
          console.log(`[toLlamaMessages] Merging consecutive ${msg.role} messages`);
          lastMsg.content += `\n\n${extracted}`;
          continue;
        }
      }
      
      out.push({ role: msg.role, content: extracted });
    }
  }

  return out;
};

/**
 * Creates a model provider for llama.cpp server
 *
 * llama.cpp exposes an OpenAI-compatible API, so we can reuse the OpenAI provider
 * from the Vercel AI SDK by pointing it to the local llama.cpp server URL.
 *
 * @param options - Configuration options
 * @param options.baseURL - The URL where llama.cpp server is running (e.g., http://localhost:8000/v1)
 * @param options.defaultModel - Default model name to use if not specified in modelName
 * @returns ModelProvider with resolveModel function
 */
export function createLlamaCppModelProvider({
  baseURL = 'http://localhost:8000',
  defaultModel = 'mistral',
}: LlamaCppModelProviderOptions = {}): ModelProvider {
  // Create a custom AI SDK-compatible model that calls llama.cpp's /v1/chat/completions
  function createLlamaCppModel(modelName: string) {
    const model = {
      specificationVersion: 'v2' as const,
      modelId: modelName,
      provider: 'custom' as const,
      supportedUrls: Promise.resolve(new Set<string>()),
      doStream: async (options: {
        temperature?: number;
        maxOutputTokens?: number;
        stopSequences?: string[];
        presencePenalty?: number;
        frequencyPenalty?: number;
        topK?: number;
        topP?: number;
        responseFormat?: unknown;
        prompt: {
          system?: string;
          messages: Array<{
            role: 'system' | 'user' | 'assistant';
            content: string;
          }>;
        };
        tools?: unknown[];
        toolChoice?: unknown;
        providerOptions?: Record<string, unknown>;
        abortSignal?: AbortSignal;
        headers?: HeadersInit;
        includeRawChunks?: boolean;
      }) => {
        // Debug logging to understand the structure
        console.log('[LlamaCpp doStream] Full options.prompt structure:', JSON.stringify(options.prompt, null, 2));
        console.log('[LlamaCpp doStream] options.prompt type:', Array.isArray(options.prompt) ? 'array' : typeof options.prompt);
        console.log('[LlamaCpp doStream] options.prompt.messages count:', options.prompt.messages?.length || 0);
        console.log('[LlamaCpp doStream] options.prompt keys:', Object.keys(options.prompt || {}));
        
        // FIX: The AI SDK Agent passes prompt as an ARRAY directly, not as { system, messages }
        // Check if prompt is an array (the actual structure from AI SDK Agent)
        let rawMessages: Array<{
          role: 'system' | 'user' | 'assistant';
          content: unknown;
        }> = [];
        
        if (Array.isArray(options.prompt)) {
          // Prompt is an array - this is the actual structure from AI SDK Agent
          console.log('[LlamaCpp doStream] Prompt is an array, extracting messages directly, count:', options.prompt.length);
          rawMessages = options.prompt as Array<{
            role: 'system' | 'user' | 'assistant';
            content: unknown;
          }>;
          console.log('[LlamaCpp doStream] Extracted rawMessages from array, count:', rawMessages.length);
        } else if (options.prompt.messages && Array.isArray(options.prompt.messages)) {
          // Prompt is an object with messages property (fallback)
          console.log('[LlamaCpp doStream] Prompt is object with messages property');
          rawMessages = options.prompt.messages;
        } else {
          console.warn('[LlamaCpp doStream] Unknown prompt structure:', typeof options.prompt);
        }
        
        // FIX: The AI SDK Agent passes messages with content as arrays (parts structure)
        // We need to extract text from the content arrays
        let messagesToProcess: Array<{
          role: 'system' | 'user' | 'assistant';
          content: string;
        }> = [];
        
        if (rawMessages.length > 0) {
          // Messages exist, extract text from content (which might be array or string)
          messagesToProcess = rawMessages.map((msg) => {
            let contentText = '';
            
            // Handle content - it might be string, array, or object
            if (typeof msg.content === 'string') {
              contentText = msg.content;
            } else if (Array.isArray(msg.content)) {
              // Content is an array (parts structure) - extract text
              contentText = (msg.content as unknown[])
                .map((item: unknown) => {
                  if (typeof item === 'string') return item;
                  if (typeof item === 'object' && item !== null) {
                    const itemObj = item as Record<string, unknown>;
                    if ('text' in itemObj && typeof itemObj.text === 'string') return itemObj.text;
                    if ('content' in itemObj && typeof itemObj.content === 'string') return itemObj.content;
                  }
                  return '';
                })
                .filter(Boolean)
                .join(' ');
            } else if (typeof msg.content === 'object' && msg.content !== null) {
              // Content is an object - try to extract text
              const contentObj = msg.content as Record<string, unknown>;
              if ('text' in contentObj) contentText = String(contentObj.text);
              else if ('content' in contentObj) contentText = String(contentObj.content);
              else contentText = JSON.stringify(msg.content);
            } else {
              contentText = String(msg.content);
            }
            
            return {
              role: msg.role,
              content: contentText,
            };
          });
          console.log('[LlamaCpp doStream] Extracted messages from prompt.messages, count:', messagesToProcess.length);
        } else {
          // Try alternative paths if messages array is empty
          const promptAny = options.prompt as Record<string, unknown>;
          if (Array.isArray(promptAny.messages)) {
            // Convert messages to the expected format
            messagesToProcess = (promptAny.messages as Array<{
              role: 'system' | 'user' | 'assistant';
              content: unknown;
            }>).map((msg) => {
              let contentText = '';
              if (typeof msg.content === 'string') {
                contentText = msg.content;
              } else if (Array.isArray(msg.content)) {
                contentText = msg.content
                  .map((item) => {
                    if (typeof item === 'string') return item;
                    if (typeof item === 'object' && item !== null && 'text' in item) {
                      return String(item.text);
                    }
                    return '';
                  })
                  .filter(Boolean)
                  .join(' ');
              } else {
                contentText = String(msg.content);
              }
              return {
                role: msg.role,
                content: contentText,
              };
            });
            console.log('[LlamaCpp doStream] Found messages in alternative path, count:', messagesToProcess.length);
          }
        }
        
        messagesToProcess.forEach((msg, idx) => {
          console.log(`[LlamaCpp doStream] Message ${idx}: role=${msg.role}, contentType=${typeof msg.content}, contentPreview="${msg.content.substring(0, 200)}"`);
        });
        
        // Create a proper prompt structure for toLlamaMessages
        // Extract system message (first message with role 'system') and separate user/assistant messages
        const systemMessage = messagesToProcess.find((msg) => msg.role === 'system');
        const nonSystemMessages = messagesToProcess.filter((msg) => msg.role !== 'system');
        
        const promptForConversion = {
          system: systemMessage?.content || (typeof options.prompt === 'object' && !Array.isArray(options.prompt) ? options.prompt.system : undefined),
          messages: nonSystemMessages,
        };
        
        console.log('[LlamaCpp doStream] Prompt for conversion:', {
          hasSystem: !!promptForConversion.system,
          systemPreview: promptForConversion.system?.substring(0, 100) || 'N/A',
          userMessageCount: nonSystemMessages.length,
        });
        
        const llamaMessages = toLlamaMessages(promptForConversion);
        console.log('[LlamaCpp doStream] Converted to llama messages:', llamaMessages.map((msg, idx) => ({
          index: idx,
          role: msg.role,
          content: msg.content.substring(0, 200),
        })));
        
        const url = `${baseURL}/v1/chat/completions`;
        const body = {
          model: modelName,
          messages: llamaMessages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxOutputTokens,
          stream: true,
          stop: options.stopSequences,
        };
        
        console.log('[LlamaCpp doStream] Final request body messages:', body.messages.map((msg, idx) => ({
          index: idx,
          role: msg.role,
          content: msg.content.substring(0, 200),
        })));
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
          },
          body: JSON.stringify(body),
          signal: options.abortSignal,
        });
        if (!res.ok || !res.body) {
          const raw = await res.text().catch(() => '');
          throw new Error(
            `llama.cpp stream error ${res.status}: ${res.statusText} - ${raw}`,
          );
        }

        // Create AI SDK-compatible stream of chunks
        const decoder = new TextDecoder();
        let textStarted = false;
        let buffer = '';
        const stream = new ReadableStream({
          async start(controller) {
            const reader = res.body!.getReader();
            // stream-start
            controller.enqueue({ type: 'stream-start', warnings: [] });
            // response metadata
            controller.enqueue({
              type: 'response-metadata',
              modelId: modelName,
              timestamp: new Date(),
            });

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                // Parse SSE frames (data: {...}) line by line, keep partial line in buffer
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed.startsWith('data:')) continue;
                  const payload = trimmed.slice(5).trim();
                  if (payload === '' || payload === '[DONE]') continue;
                  let json: LlamaCompletionStreamChunk;
                  try {
                    json = JSON.parse(payload) as LlamaCompletionStreamChunk;
                  } catch {
                    // Ignore malformed partial JSON (will be completed in next chunk)
                    continue;
                  }
                  const choice = json.choices?.[0];
                  if (!choice) continue;
                  const delta = choice.delta ?? choice.message;
                  const finishReason = choice.finish_reason;
                  const content = delta?.content ?? '';
                  if (content && content.length > 0) {
                    if (!textStarted) {
                      textStarted = true;
                      controller.enqueue({ type: 'text-start', id: 't1' });
                    }
                    controller.enqueue({
                      type: 'text-delta',
                      id: 't1',
                      delta: content,
                    });
                  }
                  if (finishReason) {
                    if (textStarted) {
                      controller.enqueue({ type: 'text-end', id: 't1' });
                    }
                    controller.enqueue({
                      type: 'finish',
                      finishReason,
                      usage: {
                        inputTokens: undefined,
                        outputTokens: undefined,
                        totalTokens: undefined,
                      },
                      providerMetadata: undefined,
                    });
                  }
                }
              }
              // Flush any final buffered line
              const final = buffer.trim();
              if (final.startsWith('data:')) {
                const payload = final.slice(5).trim();
                if (payload && payload !== '[DONE]') {
                  try {
                    const json = JSON.parse(
                      payload,
                    ) as LlamaCompletionStreamChunk;
                    const choice = json.choices?.[0];
                    if (choice) {
                      const delta = choice.delta ?? choice.message;
                      const finishReason = choice.finish_reason;
                      const content = delta?.content ?? '';
                      if (content && content.length > 0) {
                        if (!textStarted) {
                          textStarted = true;
                          controller.enqueue({ type: 'text-start', id: 't1' });
                        }
                        controller.enqueue({
                          type: 'text-delta',
                          id: 't1',
                          delta: content,
                        });
                      }
                      if (finishReason) {
                        if (textStarted) {
                          controller.enqueue({ type: 'text-end', id: 't1' });
                        }
                        controller.enqueue({
                          type: 'finish',
                          finishReason,
                          usage: {
                            inputTokens: undefined,
                            outputTokens: undefined,
                            totalTokens: undefined,
                          },
                          providerMetadata: undefined,
                        });
                      }
                    }
                  } catch {
                    // ignore
                  }
                }
              }
            } catch (err) {
              controller.enqueue({
                type: 'error',
                error: err instanceof Error ? err.message : String(err),
              });
            } finally {
              controller.close();
            }
          },
        });

        return {
          stream,
          response: {
            id: `llamacpp-${Date.now()}`,
            modelId: modelName,
            timestamp: new Date(),
          },
          request: body,
        };
      },
      doGenerate: async (options: {
        inputFormat: 'messages';
        messages: Array<{
          role: 'system' | 'user' | 'assistant';
          content: string;
        }>;
        temperature?: number;
        maxTokens?: number;
      }) => {
        const url = `${baseURL}/v1/chat/completions`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: modelName,
            messages: toLlamaMessages({
              system: undefined,
              messages: options.messages,
            }),
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens,
            stream: false,
          }),
        });

        if (!response.ok) {
          const raw = await response.text();
          throw new Error(
            `llama.cpp error ${response.status}: ${response.statusText} - ${raw}`,
          );
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content ?? '';
        const finishReason = data?.choices?.[0]?.finish_reason ?? 'stop';

        return {
          text: content,
          finishReason: finishReason === 'stop' ? 'stop' : 'length',
          usage: {
            promptTokens: data?.usage?.prompt_tokens ?? 0,
            completionTokens: data?.usage?.completion_tokens ?? 0,
            totalTokens: data?.usage?.total_tokens ?? 0,
          },
          response: {
            id: data?.id ?? `llamacpp-${Date.now()}`,
            model: modelName,
            choices: [
              {
                message: { role: 'assistant' as const, content },
                finish_reason: finishReason,
              },
            ],
          },
        };
      },
    };

    return model as never; // satisfy AI SDK LanguageModel type
  }

  return {
    resolveModel: (modelName) => {
      const finalModel = modelName || defaultModel;
      if (!finalModel) {
        throw new Error(
          "[AgentFactory] Missing llama.cpp model. Provide it as 'llamacpp/<model-name>' or set LLAMACPP_MODEL.",
        );
      }
      return createLlamaCppModel(finalModel);
    },
  };
}
