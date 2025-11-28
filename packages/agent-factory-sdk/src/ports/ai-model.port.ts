import { type Message } from '../domain/message.type';

export type IAiModel = {
  name: string;
  temperature?: number;
};

export abstract class IAIModelProvider {
  abstract initialize(
    model: string,
    streaming: boolean,
    visual: boolean,
    meta: Record<string, unknown>,
  ): Promise<void>;

  abstract start(systemPrompt: string, userPrompt: string): Promise<Message[]>;

  abstract step(messages: Message[], prompt: string): Promise<Message[]>;

  abstract stream(options: {
    history: Message[];
    prompt: string;
    systemPrompt?: string;
    isInitial: boolean;
  }): Promise<AsyncIterable<string>>;
}
