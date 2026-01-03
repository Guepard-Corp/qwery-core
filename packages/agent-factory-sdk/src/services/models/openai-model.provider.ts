import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModel } from 'ai';

type ModelProvider = {
   resolveModel: (modelName: string) => LanguageModel;
};

export type OpenAIModelProviderOptions = {
   apiKey?: string;
   baseUrl?: string;
   defaultModel?: string;
};

export function createOpenAIModelProvider({
   apiKey,
   baseUrl,
   defaultModel,
}: OpenAIModelProviderOptions = {}): ModelProvider {
   // Create an OpenAI instance. 
   // If apiKey is missing (common for local llms), we provide a dummy one if allowed, 
   // or rely on the SDK's default behavior looking for OPENAI_API_KEY.
   const openai = createOpenAI({
      apiKey: apiKey || 'not-needed', // Many local servers accept any string
      baseURL: baseUrl,
      compatibility: 'compatible', // Force standard OpenAI endpoints
      fetch: async (url, options) => {
         // Special handling for local llama-server to fix "Only user and assistant roles are supported" error
         if (url.toString().includes('127.0.0.1') || url.toString().includes('localhost')) {
            try {
               let wasStreaming = false;

               if (options?.body) {
                  const body = JSON.parse(options.body as string);
                  if (body.messages && Array.isArray(body.messages)) {
                     const newMessages: any[] = [];
                     let systemPrompt = "";

                     for (const msg of body.messages) {
                        if (msg.role === 'system') {
                           systemPrompt += (msg.content || "") + "\n\n";
                        } else if (msg.role === 'tool') {
                           // Convert tool outputs to User messages to satisfy strict templates
                           // and maintain User/Assistant alternation
                           newMessages.push({
                              role: 'user',
                              content: `[Tool Output] ${msg.content}`
                           });
                        } else if (msg.role === 'assistant' && (msg.tool_calls || !msg.content)) {
                           // Fix for "content is mandatory" AND remove tool_calls to prevent server side tool logic
                           // Convert tool_calls to text representation so the model sees what it did
                           const toolNames = msg.tool_calls ? msg.tool_calls.map((t: any) => t.function.name).join(', ') : 'unknown';
                           newMessages.push({
                              role: 'assistant',
                              content: msg.content || `[Calling tool: ${toolNames}]`
                              // INTENTIONALLY OMIT tool_calls property
                           });
                        } else {
                           // Deep copy and sanitize plain messages
                           const cleanMsg = {
                              role: msg.role,
                              content: msg.content
                           };
                           newMessages.push(cleanMsg);
                        }
                     }

                     // Prepend collected system prompt to the first user message
                     if (systemPrompt) {
                        const firstUserIndex = newMessages.findIndex(m => m.role === 'user');
                        if (firstUserIndex !== -1) {
                           newMessages[firstUserIndex].content = systemPrompt + newMessages[firstUserIndex].content;
                        } else {
                           // If no user message (rare), create one
                           newMessages.push({ role: 'user', content: systemPrompt });
                        }
                     }

                     // Second pass: Coalesce adjacent messages with the same role
                     const coalescedMessages: any[] = [];
                     if (newMessages.length > 0) {
                        let currentMsg = newMessages[0];

                        for (let i = 1; i < newMessages.length; i++) {
                           const nextMsg = newMessages[i];
                           if (nextMsg.role === currentMsg.role) {
                              // Merge content
                              const currentContent = currentMsg.content || "";
                              const nextContent = nextMsg.content || "";

                              // Simple text merging
                              if (typeof currentContent === 'string' && typeof nextContent === 'string') {
                                 currentMsg.content = currentContent + "\n\n" + nextContent;
                              } else {
                                 // Fallback: Force string conversion
                                 currentMsg.content = String(currentContent) + "\n\n" + String(nextContent);
                              }
                           } else {
                              coalescedMessages.push(currentMsg);
                              currentMsg = nextMsg;
                           }
                        }
                        coalescedMessages.push(currentMsg);
                     }

                     body.messages = coalescedMessages;
                     options.body = JSON.stringify(body);
                  }

                  // 3. Force disable streaming for local models to allow us to parse tool calls from text
                  if (body.stream) {
                     body.stream = false;
                     wasStreaming = true;
                     options.body = JSON.stringify(body);
                  }
               }

               const response = await fetch(url, options);

               // 4. Client-side Tool Parsing Adapter
               // Since we forced stream: false, we can read the JSON body
               if (response.ok) {
                  const data = await response.json();

                  if (data.choices && data.choices[0] && data.choices[0].message) {
                     let content = data.choices[0].message.content || "";

                     // Check for our custom tool call pattern
                     // Pattern: <<<TOOL_CALL>>>{JSON}<<<END_TOOL_CALL>>>
                     const TOOL_START = "<<<TOOL_CALL>>>";
                     const TOOL_END = "<<<END_TOOL_CALL>>>";

                     // Simple parser for single tool call (most common)
                     const startIndex = content.indexOf(TOOL_START);
                     const endIndex = content.indexOf(TOOL_END);

                     if (startIndex !== -1 && endIndex !== -1) {
                        const jsonStr = content.substring(startIndex + TOOL_START.length, endIndex);
                        try {
                           const toolCall = JSON.parse(jsonStr);
                           if (toolCall.name) {
                              // Construct OpenAI tool_call object
                              const openAIToolCall = {
                                 id: `call_${Math.random().toString(36).substring(2, 9)}`,
                                 type: 'function',
                                 function: {
                                    name: toolCall.name,
                                    arguments: JSON.stringify(toolCall.arguments || {})
                                 }
                              };

                              // Update the message to be a tool call
                              data.choices[0].message.tool_calls = [openAIToolCall];
                              data.choices[0].message.content = content.substring(0, startIndex).trim(); // Keep text before tool

                              // If content is empty after strip, ensure it's null (standard OpenAI)
                              if (!data.choices[0].message.content) {
                                 data.choices[0].message.content = null;
                              }

                              // Log for debugging
                              console.log("[LocalAdapter] Parsed Tool Call:", toolCall.name);
                           }
                        } catch (e) {
                           console.warn("[LocalAdapter] Failed to parse tool JSON:", e);
                        }
                     }
                  }

                  // If client requested valid stream, we MUST simulate it to avoid crashing the AI SDK
                  if (wasStreaming) {
                     const encoder = new TextEncoder();
                     const stream = new ReadableStream({
                        start(controller) {
                           // Simulate initial chunk (metadata)
                           const initialChunk = {
                              id: data.id || 'chatcmpl-mock',
                              object: 'chat.completion.chunk',
                              created: Date.now(),
                              model: data.model || 'local-model',
                              choices: [{
                                 index: 0,
                                 delta: { role: 'assistant', content: '' },
                                 finish_reason: null
                              }]
                           };
                           controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialChunk)}\n\n`));

                           // Simulate content chunk(s)
                           const message = data.choices[0]?.message || {};

                           // Send content if present
                           if (message.content) {
                              const contentChunk = {
                                 id: data.id || 'chatcmpl-mock',
                                 object: 'chat.completion.chunk',
                                 created: Date.now(),
                                 model: data.model || 'local-model',
                                 choices: [{
                                    index: 0,
                                    delta: { content: message.content },
                                    finish_reason: null
                                 }]
                              };
                              controller.enqueue(encoder.encode(`data: ${JSON.stringify(contentChunk)}\n\n`));
                           }

                           // Send tool calls if present
                           if (message.tool_calls) {
                              // Tool calls need index field in streaming format
                              const streamingToolCalls = message.tool_calls.map((tc: any, idx: number) => ({
                                 index: idx,
                                 id: tc.id,
                                 type: tc.type,
                                 function: tc.function
                              }));

                              const toolChunk = {
                                 id: data.id || 'chatcmpl-mock',
                                 object: 'chat.completion.chunk',
                                 created: Date.now(),
                                 model: data.model || 'local-model',
                                 choices: [{
                                    index: 0,
                                    delta: { tool_calls: streamingToolCalls },
                                    finish_reason: null
                                 }]
                              };
                              controller.enqueue(encoder.encode(`data: ${JSON.stringify(toolChunk)}\n\n`));
                           }

                           // Simulate final chunk (finish_reason)
                           const finalChunk = {
                              id: data.id || 'chatcmpl-mock',
                              object: 'chat.completion.chunk',
                              created: Date.now(),
                              model: data.model || 'local-model',
                              choices: [{
                                 index: 0,
                                 delta: {},
                                 finish_reason: data.choices[0]?.finish_reason || 'stop'
                              }]
                           };
                           controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`));
                           controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                           controller.close();
                        }
                     });

                     return new Response(stream, {
                        headers: {
                           'Content-Type': 'text/event-stream',
                           'Cache-Control': 'no-cache',
                           'Connection': 'keep-alive',
                        }
                     });
                  }

                  // Return new response with modified JSON (non-streaming)
                  return new Response(JSON.stringify(data), {
                     status: response.status,
                     statusText: response.statusText,
                     headers: response.headers
                  });
               }

               // Debug: Log response from local model to see if it's empty or erroring silently
               try {
                  const clone = response.clone();
                  const text = await clone.text();
                  console.log("[Local LLM Response]", response.status, text.substring(0, 200));
               } catch (e) {
                  // Ignore logging errors
               }

               return response;

            } catch (e) {
               console.warn("[OpenAI Provider] Failed to normalize local messages:", e);
               return fetch(url, options);
            }
         }
         return fetch(url, options);
      }
   } as any);

   return {
      resolveModel: (modelName) => {
         const finalModel = modelName || defaultModel;
         if (!finalModel) {
            throw new Error(
               "[AgentFactory] Missing OpenAI model. Provide it as 'openai/<model-name>' or set OPENAI_MODEL.",
            );
         }
         return openai.chat(finalModel);
      },
   };
}
