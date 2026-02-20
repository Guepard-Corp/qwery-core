import {
  streamText,
  stepCountIs,
  type LanguageModel,
  type ModelMessage,
  type Tool,
} from 'ai';
import type { Model } from './provider';
import { Provider } from './provider';
import { SystemPrompt } from './system';
import type { Message } from '@qwery/domain/entities';
import { Messages } from './message';

/**
 * Multi-step tool loop (streamText + tools + stopWhen).
 * AI SDK 6 supports adding output: Output.object({ schema }) for a final
 * structured step after the tool loop; we enforce structure at the tool
 * level (e.g. runQuery/runQueries exportFilename in tool input schema).
 */
export type StreamInput = {
  model?: string | Model;
  prompt?: string;
  messages?: ModelMessage[] | Message[];
  system?: string;
  systemPrompt?: string;
  tools?: Record<string, Tool>;
  abortSignal?: AbortSignal;
  maxRetries?: number;
  temperature?: number;
  maxOutputTokens?: number;
  maxSteps?: number;
  context?: { cwd?: string; date?: string };
  onFinish?: () => void | Promise<void>;
};

export type StreamOutput = ReturnType<typeof streamText>;

function isMessageArray(
  messages: ModelMessage[] | Message[],
): messages is Message[] {
  if (messages.length === 0) return false;
  const first = messages[0];
  return (
    first !== null &&
    typeof first === 'object' &&
    'content' in first &&
    'conversationId' in first
  );
}

export const LLM = {
  async stream(input: StreamInput): Promise<StreamOutput> {
    const model =
      typeof input.model === 'string'
        ? input.model
          ? Provider.getModelFromString(input.model)
          : Provider.getDefaultModel()
        : (input.model ?? Provider.getDefaultModel());
    const language = await Provider.getLanguage(model);

    let system: string | undefined = input.system ?? input.systemPrompt;
    if (system === undefined) {
      const parts = [
        SystemPrompt.instructions(),
        SystemPrompt.provider(model),
        ...(await SystemPrompt.environment(model, input.context)),
      ].filter(Boolean);
      system = parts.join('\n\n');
    }

    let messages: ModelMessage[] | undefined;
    if (input.messages) {
      if (isMessageArray(input.messages)) {
        messages = await Messages.toModelMessages(input.messages, model);
      } else {
        messages = input.messages;
      }
    }

    const prompt = input.prompt;
    const streamParams = {
      model: language,
      ...(system !== undefined && system !== '' ? { system } : {}),
      ...(input.tools !== undefined ? { tools: input.tools } : {}),
      abortSignal: input.abortSignal,
      maxRetries: input.maxRetries,
      temperature: input.temperature,
      ...(input.maxOutputTokens !== undefined
        ? { maxOutputTokens: input.maxOutputTokens }
        : {}),
      ...(input.tools !== undefined && Object.keys(input.tools).length > 0
        ? { stopWhen: stepCountIs(input.maxSteps ?? 5) }
        : {}),
      ...(input.onFinish !== undefined ? { onFinish: input.onFinish } : {}),
    };
    if (prompt !== undefined) {
      return streamText({ ...streamParams, prompt });
    }
    return streamText({
      ...streamParams,
      messages: messages ?? [],
    });
  },

  async getLanguage(model: Model | string): Promise<LanguageModel> {
    const m =
      typeof model === 'string' ? Provider.getModelFromString(model) : model;
    return Provider.getLanguage(m);
  },

  getDefaultModel(): Model {
    return Provider.getDefaultModel();
  },
};
