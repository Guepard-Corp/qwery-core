import { Message } from '../domain/message.type';
import { IAIModelProvider } from '../ports/ai-model.port';

export type ProviderFactory = (modelName: string) => IAIModelProvider;

export type MultiProviderModelPortOptions = {
  providers: Record<string, ProviderFactory>;
  defaultProvider?: string;
};

export class MultiProviderModelPort extends IAIModelProvider {
  private delegate: { providerId: string; port: IAIModelProvider } | null =
    null;

  constructor(private readonly options: MultiProviderModelPortOptions) {
    super();
  }

  async initialize(
    model: string,
    streaming: boolean,
    visual: boolean,
    meta: Record<string, unknown>,
  ): Promise<void> {
    const { providerId, innerModelName } = parseModelName(model);
    const resolvedProviderId = providerId ?? this.options.defaultProvider;

    if (!resolvedProviderId) {
      throw new Error(
        `[AgentFactory] Missing provider for model '${model}'. Use '<provider>/<model>' or set AGENT_PROVIDER.`,
      );
    }

    const factory = this.options.providers[resolvedProviderId];
    if (!factory) {
      throw new Error(
        `[AgentFactory] Unsupported provider '${resolvedProviderId}'. Available providers: ${Object.keys(this.options.providers).join(', ') || 'none'}.`,
      );
    }

    const delegate = factory(innerModelName);
    this.delegate = { providerId: resolvedProviderId, port: delegate };
    await delegate.initialize(innerModelName, streaming, visual, meta);
  }

  async start(systemPrompt: string, userPrompt: string): Promise<Message[]> {
    const delegate = this.ensureDelegate();
    return delegate.start(systemPrompt, userPrompt);
  }

  async step(messages: Message[], prompt: string): Promise<Message[]> {
    const delegate = this.ensureDelegate();
    return delegate.step(messages, prompt);
  }

  async stream(options: {
    history: Message[];
    prompt: string;
    systemPrompt?: string;
    isInitial: boolean;
  }): Promise<AsyncIterable<string>> {
    const delegate = this.ensureDelegate();
    return delegate.stream(options);
  }

  private ensureDelegate(): IAIModelProvider {
    if (!this.delegate) {
      throw new Error(
        '[AgentFactory] Provider was not initialized. Call initialize() first.',
      );
    }
    return this.delegate.port;
  }
}

export function parseModelName(modelName: string): {
  providerId?: string;
  innerModelName: string;
} {
  if (!modelName) {
    return { innerModelName: '' };
  }

  const separatorIndex = modelName.indexOf('/');
  if (separatorIndex === -1) {
    return { innerModelName: modelName };
  }

  const providerId = modelName.slice(0, separatorIndex);
  const innerModelName = modelName.slice(separatorIndex + 1);
  return { providerId, innerModelName };
}
