import { type Message } from '../entities';

export type IAiModel = {
  name: string;
  temperature?: number;
};

export abstract class AIModelPort {
  abstract initialize(
    model: string,
    streaming: boolean,
    visual: boolean,
    meta: Record<string, unknown>,
  ): Promise<void>;

  abstract start(systemPrompt: string, userPrompt: string): Promise<Message[]>;

  abstract step(messages: Message[], prompt: string): Promise<Message[]>;
}
