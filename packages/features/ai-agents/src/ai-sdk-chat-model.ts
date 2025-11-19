import {
  BaseChatModel,
  type BaseChatModelParams,
} from '@langchain/core/language_models/chat_models';
import {
  AIMessage,
  BaseMessage,
  ChatMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';
import type { ChatGeneration, ChatResult } from '@langchain/core/outputs';
import type { LanguageModelV2 } from '@ai-sdk/provider';
import { generateText } from 'ai';

type BaseModelInput = Parameters<typeof generateText>[0]['model'];
type AiModelInput = BaseModelInput | LanguageModelV2;

export interface AiSdkChatModelParams extends BaseChatModelParams {
  model: AiModelInput;
  promptPrefix?: string;
  temperature?: number;
}

export class AiSdkChatModel extends BaseChatModel {
  private readonly model: AiModelInput;
  private readonly promptPrefix?: string;
  private readonly temperature?: number;

  constructor(params: AiSdkChatModelParams) {
    super(params);
    this.model = params.model;
    this.promptPrefix = params.promptPrefix;
    this.temperature = params.temperature;
  }

  _llmType(): string {
    return 'ai-sdk';
  }

  private serializeMessages(messages: BaseMessage[]): string {
    const serialized = messages
      .map((message) => {
        const content =
          typeof message.content === 'string'
            ? message.content
            : JSON.stringify(message.content);

        if (message instanceof SystemMessage) {
          return `SYSTEM: ${content}`;
        }

        if (message instanceof HumanMessage) {
          return `USER: ${content}`;
        }

        if (message instanceof AIMessage) {
          return `ASSISTANT: ${content}`;
        }

        if (message instanceof ChatMessage) {
          return `${message.role.toUpperCase()}: ${content}`;
        }

        return content;
      })
      .join('\n');

    if (this.promptPrefix) {
      return `${this.promptPrefix}\n${serialized}`;
    }

    return serialized;
  }

  async _generate(messages: BaseMessage[]): Promise<ChatResult> {
    const prompt = this.serializeMessages(messages);
    const { text } = await generateText({
      model: this.model,
      prompt,
      temperature: this.temperature,
    });

    const aiMessage = new AIMessage({
      content: text,
    });

    const generation: ChatGeneration = {
      message: aiMessage,
      text,
    };

    return {
      generations: [generation],
    };
  }
}

