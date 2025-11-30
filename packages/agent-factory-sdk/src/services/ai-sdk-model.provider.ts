import {
  generateText,
  streamText,
  type CallSettings as AiCallSettings,
  type CoreMessage,
  type ModelMessage,
  type TextPart,
} from 'ai';
import { nanoid } from 'nanoid';
import { Message, MessageRole, type TextContent } from '../domain/message.type';
import { IAIModelProvider } from '../ports/ai-model.port';

type CallSettings = Pick<
  AiCallSettings,
  | 'maxOutputTokens'
  | 'temperature'
  | 'topP'
  | 'topK'
  | 'presencePenalty'
  | 'frequencyPenalty'
  | 'stopSequences'
  | 'seed'
>;

type InitializeMetadata = {
  temperature?: number;
  conversationId?: string;
  agentName?: string;
};

export type AiSdkModelResolver = (modelName: string) => unknown;

export interface AiSdkModelProviderOptions {
  resolveModel?: AiSdkModelResolver;
  defaultCallSettings?: CallSettings;
}

export class AiSdkModelProvider extends IAIModelProvider {
  private readonly resolveModel?: AiSdkModelResolver;
  private readonly defaultCallSettings: CallSettings;
  private model: unknown;
  private callSettings: CallSettings = {};
  private conversationId: string = '';
  private agentName: string = 'agent';

  constructor(options: AiSdkModelProviderOptions = {}) {
    super();
    this.resolveModel = options.resolveModel;
    this.defaultCallSettings = options.defaultCallSettings ?? {};
  }

  async initialize(
    model: string,
    _streaming: boolean,
    _visual: boolean,
    meta: Record<string, unknown>,
  ): Promise<void> {
    this.model = this.resolveModel?.(model) ?? model;
    const metadata = meta as InitializeMetadata;
    const temperature =
      metadata.temperature ?? this.defaultCallSettings.temperature;

    this.callSettings = {
      ...this.defaultCallSettings,
      ...cleanUndefined({
        temperature,
      }),
    };

    this.conversationId = metadata.conversationId ?? nanoid();
    this.agentName = metadata.agentName ?? 'agent';
  }

  async start(systemPrompt: string, userPrompt: string): Promise<Message[]> {
    const model = this.ensureModel();
    const result = await generateText({
      model: model as never,
      system: systemPrompt || undefined,
      prompt: userPrompt,
      ...this.callSettings,
    });

    const messageText = extractText(result);
    return [this.createAssistantMessage(messageText)];
  }

  async step(messages: Message[], prompt: string): Promise<Message[]> {
    const model = this.ensureModel();
    const history = this.toModelMessages(messages);
    const userMessage: CoreMessage = {
      role: 'user',
      content: this.toTextParts(prompt),
    };

    const result = await generateText({
      model: model as never,
      messages: [...history, userMessage],
      ...this.callSettings,
    });

    const messageText = extractText(result);
    return [this.createAssistantMessage(messageText)];
  }

  async stream({
    history,
    prompt,
    systemPrompt,
    isInitial,
  }: {
    history: Message[];
    prompt: string;
    systemPrompt?: string;
    isInitial: boolean;
  }): Promise<AsyncIterable<string>> {
    const model = this.ensureModel();

    if (isInitial) {
      const result = streamText({
        model: model as never,
        system: systemPrompt || undefined,
        prompt,
        ...this.callSettings,
      });

      return result.textStream;
    }

    const historyMessages = this.toModelMessages(history);
    const userMessage: CoreMessage = {
      role: 'user',
      content: this.toTextParts(prompt),
    };

    const result = streamText({
      model: model as never,
      messages: [...historyMessages, userMessage],
      ...this.callSettings,
    });

    return result.textStream;
  }

  /**
   * Resolves a model name to an AI SDK model instance.
   * This is a public method that exposes the resolveModel functionality.
   */
  resolveModelInstance(modelName: string): unknown {
    if (this.resolveModel) {
      return this.resolveModel(modelName);
    }
    throw new Error(
      '[AiSdkModelProvider] No resolveModel function configured.',
    );
  }

  private ensureModel(): unknown {
    if (!this.model) {
      throw new Error(
        'AI SDK model is not initialized. Call initialize() first.',
      );
    }
    return this.model;
  }

  private createAssistantMessage(content: string): Message {
    const timestamp = new Date();
    return {
      id: nanoid(),
      conversationId: this.conversationId,
      type: 'text',
      role: MessageRole.ASSISTANT,
      content,
      metadata: { provider: 'ai-sdk' },
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: this.agentName,
      updatedBy: this.agentName,
    };
  }

  private toModelMessages(messages: Message[]): ModelMessage[] {
    return messages.map((message) => ({
      role: this.mapRole(message.role),
      content: this.toTextParts(message.content),
    })) as ModelMessage[];
  }

  private mapRole(role: MessageRole): CoreMessage['role'] {
    switch (role) {
      case MessageRole.SYSTEM:
        return 'system';
      case MessageRole.USER:
        return 'user';
      default:
        return 'assistant';
    }
  }

  private toTextParts(content: Message['content'] | string): TextPart[] {
    if (typeof content === 'string') {
      return [{ type: 'text', text: content }];
    }

    if (Array.isArray(content)) {
      return content.map((part: TextContent) => ({
        type: 'text',
        text: part.text,
      }));
    }

    return [{ type: 'text', text: String(content) }];
  }
}

function cleanUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.entries(value).reduce((acc, [key, val]) => {
    if (val !== undefined) {
      acc[key as keyof T] = val as T[keyof T];
    }
    return acc;
  }, {} as T);
}

type GenerateTextOutput = Awaited<ReturnType<typeof generateText>>;

function extractText(result: GenerateTextOutput): string {
  const direct = result.text?.trim();
  if (direct) {
    return direct;
  }

  const fromContent = result.content
    .map((part) => (isTextPart(part) ? part.text : ''))
    .join('')
    .trim();
  if (fromContent) {
    return fromContent;
  }

  const fromResponse =
    result.response?.messages
      ?.map((message) => {
        if (Array.isArray(message.content)) {
          return message.content
            .map((part) => (isTextPart(part) ? part.text : ''))
            .join('');
        }

        if (typeof message.content === 'string') {
          return message.content;
        }

        return '';
      })
      .join('')
      .trim() ?? '';

  return fromResponse;
}

function isTextPart(part: unknown): part is TextPart {
  return Boolean(
    part &&
      typeof part === 'object' &&
      'type' in part &&
      (part as TextPart).type === 'text',
  );
}
