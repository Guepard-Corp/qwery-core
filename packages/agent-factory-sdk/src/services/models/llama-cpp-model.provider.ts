export type LlamaCppModelProviderOptions = {
    baseUrl?: string;
    defaultModel?: string;
};

export class LlamaCppLanguageModel {
    readonly specificationVersion = 'v2' as const;
    readonly provider = 'llama-cpp';

    constructor(
        readonly modelId: string,
        private readonly baseUrl: string,
    ) { }

    get defaultObjectGenerationMode() {
        return 'json' as const;
    }

    async doGenerate(options: any): Promise<any> {
        console.log(`[LlamaCpp] doGenerate called for ${this.modelId}`);
        const response = await this.callLlamaCpp(options, false);
        const data = await response.json();
        console.log(`[LlamaCpp] Response data:`, JSON.stringify(data).slice(0, 200));

        const text = data.choices?.[0]?.message?.content ?? '';
        return {
            text,
            // v2 SDK expects content array for extractTextContent
            content: [{ type: 'text', text }],
            finishReason: this.mapFinishReason(data.choices?.[0]?.finish_reason),
            usage: {
                promptTokens: data.usage?.prompt_tokens ?? 0,
                completionTokens: data.usage?.completion_tokens ?? 0,
            },
            rawCall: { rawPrompt: options.prompt, rawSettings: options },
            rawResponse: { headers: {} },
            warnings: [],
            logprobs: undefined,
            request: undefined,
            response: {
                id: data.id,
                timestamp: new Date(),
                modelId: this.modelId,
            },
        };
    }

    async doStream(options: any): Promise<any> {
        const modelId = this.modelId;
        const messages = this.convertMessages(options.prompt);

        const response = await this.callLlamaCpp(options, true);

        if (!response.body) {
            throw new Error('No response body from LlamaCpp');
        }

        const stream = new ReadableStream<any>({
            async start(controller) {
                const reader = response.body!.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                // Generate a stable ID for the text part
                const textPartId = `text_${Date.now()}`;

                // Helper to process a single line and return true if stream should close
                let isFirstChunk = true;
                const processLine = (line: string): boolean => {
                    if (line.trim() === '' || line.trim() === 'data: [DONE]') return false;
                    if (!line.startsWith('data: ')) return false;

                    try {
                        const json = JSON.parse(line.slice(6));

                        const delta = json.choices?.[0]?.delta?.content;
                        const finishReason = json.choices?.[0]?.finish_reason;

                        if (typeof delta === 'string') {
                            if (isFirstChunk) {
                                controller.enqueue({
                                    type: 'text-start', // Potential V2/Internal requirement
                                    id: textPartId,
                                    experimental_providerMetadata: {},
                                });
                                isFirstChunk = false;
                            }

                            controller.enqueue({
                                type: 'text-delta',
                                textDelta: delta,                // Standard V1 spec
                                delta: delta,                    // Internal SDK requirement
                                id: textPartId,                  // Stable ID
                                experimental_providerMetadata: {},
                            });
                        }

                        if (finishReason) {
                            const mappedReason = mapFinishReason(finishReason);

                            controller.enqueue({
                                type: 'finish',
                                finishReason: mappedReason,
                                usage: {
                                    promptTokens: json.usage?.prompt_tokens ?? 0,
                                    completionTokens: json.usage?.completion_tokens ?? 0,
                                },
                                response: {
                                    id: json.id || `gen_${Date.now()}`,
                                    timestamp: new Date(),
                                    modelId: modelId,
                                },
                                experimental_providerMetadata: {},
                            });

                            try { controller.close(); } catch (e) { /* ignore already closed */ }
                            return true;
                        }
                    } catch (e) {
                        if (e instanceof Error && e.message.includes('Controller is already closed')) {
                            return true; // Treat as stop
                        }
                        console.warn('[LlamaCpp] Parse error:', e);
                    }
                    return false;
                };

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            // Process any remaining buffer
                            if (buffer.trim().length > 0) {
                                processLine(buffer);
                            }
                            try { controller.close(); } catch (e) { /* ignore */ }
                            break;
                        }

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop() ?? '';

                        for (const line of lines) {
                            if (processLine(line)) return;
                        }
                    }
                } catch (error) {
                    // Ignore error if it's just "Controller is already closed" which can happen on race conditions
                    if (error instanceof Error && error.message.includes('Controller is already closed')) {
                        return;
                    }
                    console.error('[LlamaCpp] Stream error:', error);
                    try { controller.error(error); } catch (e) { /* ignore */ }
                }
            }
        });

        return {
            stream,
            rawCall: { rawPrompt: messages, rawSettings: options },
            rawResponse: { headers: {} },
            warnings: [],
            request: undefined,
        };
    }

    private async callLlamaCpp(options: any, stream: boolean) {
        const messages = this.convertMessages(options.prompt);
        const body = {
            model: this.modelId,
            messages,
            stream,
            max_tokens: options.maxTokens,
            temperature: options.temperature,
        };

        const res = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Llama.cpp error: ${res.statusText} - ${errorText}`);
        }

        return res;
    }

    private convertMessages(prompt: any) {
        // Comprehensive logging for debugging
        console.log(`[LlamaCpp] convertMessages called with:`, {
            type: typeof prompt,
            isArray: Array.isArray(prompt),
            keys: prompt && typeof prompt === 'object' ? Object.keys(prompt) : 'N/A',
        });

        // Handle different prompt formats safely
        let messages: any[] = [];

        if (Array.isArray(prompt)) {
            messages = prompt;
        } else if (prompt && typeof prompt === 'object') {
            if (Array.isArray(prompt.messages)) {
                messages = prompt.messages;
            } else if (prompt.prompt && Array.isArray(prompt.prompt)) {
                messages = prompt.prompt;
            } else {
                console.warn('[LlamaCpp] Unexpected prompt structure:', prompt);
                // Fallback: treat as single user message
                messages = [{ role: 'user', content: String(prompt) }];
            }
        } else {
            console.warn('[LlamaCpp] Invalid prompt type:', typeof prompt);
            messages = [];
        }

        console.log(`[LlamaCpp] Converting ${messages.length} messages`);

        return messages.map((p: any) => {
            let content = '';
            if (typeof p.content === 'string') {
                content = p.content;
            } else if (Array.isArray(p.content)) {
                content = p.content
                    .filter((c: any) => c.type === 'text')
                    .map((c: any) => c.text || '')
                    .join('');
            }
            return { role: p.role ?? 'user', content };
        });
    }

    private mapFinishReason(reason: string | null): any {
        if (reason === 'stop') return 'stop';
        if (reason === 'length') return 'length';
        return 'other';
    }
}

function mapFinishReason(reason: string | null): any {
    if (reason === 'stop') return 'stop';
    if (reason === 'length') return 'length';
    return 'other';
}

export function createLlamaCppModelProvider({
    baseUrl = 'http://127.0.0.1:8080/v1',
    defaultModel,
}: LlamaCppModelProviderOptions = {}): any {
    return {
        resolveModel: (modelName: string) => {
            const finalModel = modelName || defaultModel || 'default';
            return new LlamaCppLanguageModel(finalModel, baseUrl);
        },
    };
}
