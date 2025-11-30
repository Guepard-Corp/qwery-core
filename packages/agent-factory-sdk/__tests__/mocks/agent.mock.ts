import { nanoid } from 'nanoid';
import { AgentSession } from '../../src/domain/agent-session.type';
import { IAgentSideEffects } from '../../src/ports/agent-side-effects.port';
import { IAIModelProvider } from '../../src/ports/ai-model.port';
import { IAgentMemory } from '../../src/ports/agent-memory.port';
import { IAgentWorkspace } from '../../src/ports/agent-workspace.port';
import { Message, MessageRole } from '../../src/domain/message.type';

export class MockAgentSideEffects extends IAgentSideEffects {
  public onTransitionCalls: Array<{
    session: AgentSession;
    from: string;
    to: string;
    command: string;
  }> = [];

  public onTerminalStateCalls: Array<{
    session: AgentSession;
    phase: string;
  }> = [];

  async onTransition(
    session: AgentSession,
    from: string,
    to: string,
    command: string,
  ): Promise<void> {
    this.onTransitionCalls.push({ session, from, to, command });
  }

  async onTerminalState(session: AgentSession, phase: string): Promise<void> {
    this.onTerminalStateCalls.push({ session, phase });
  }
}

export class MockAIModel extends IAIModelProvider {
  public startCalls = 0;
  public stepCalls = 0;
  public streamCalls = 0;
  public initializedWith: {
    model: string;
    streaming: boolean;
    visual: boolean;
    meta: Record<string, unknown>;
  } | null = null;

  private readonly conversationId = nanoid();

  async initialize(
    model: string,
    streaming: boolean,
    visual: boolean,
    meta: Record<string, unknown>,
  ): Promise<void> {
    this.initializedWith = { model, streaming, visual, meta };
  }

  async start(systemPrompt: string, userPrompt: string): Promise<Message[]> {
    this.startCalls += 1;
    return [this.createMessage(systemPrompt ? 'Hello' : `Echo: ${userPrompt}`)];
  }

  async step(messages: Message[], prompt: string): Promise<Message[]> {
    this.stepCalls += 1;
    return [this.createMessage(`Step: ${prompt}`)];
  }

  async stream({
    prompt,
    isInitial,
  }: {
    history: Message[];
    prompt: string;
    systemPrompt?: string;
    isInitial: boolean;
  }): Promise<AsyncIterable<string>> {
    if (isInitial) {
      this.startCalls += 1;
      return this.createStream('Hello');
    }

    this.stepCalls += 1;
    return this.createStream(`Step: ${prompt}`);
  }

  private createMessage(
    content: string,
    role: MessageRole = MessageRole.ASSISTANT,
  ): Message {
    const now = new Date();

    return {
      id: nanoid(),
      conversationId: this.conversationId,
      type: 'text',
      content,
      role,
      metadata: {},
      createdAt: now,
      updatedAt: now,
      createdBy: 'mock-ai',
      updatedBy: 'mock-ai',
    };
  }

  private createStream(content: string): AsyncIterable<string> {
    return (async function* () {
      yield content;
    })();
  }
}

export class MockAgentMemory extends IAgentMemory {
  async initialize(_name: string): Promise<void> {
    return;
  }

  async setItem(_key: string, _value: unknown): Promise<void> {
    return;
  }

  async getItem(_key: string): Promise<unknown> {
    return null;
  }

  async removeItem(_key: string): Promise<void> {
    return;
  }

  async clear(): Promise<void> {
    return;
  }

  async keys(): Promise<string[]> {
    return [];
  }

  async values(): Promise<unknown[]> {
    return [];
  }

  async entries(): Promise<[string, unknown][]> {
    return [];
  }
}

export class MockAgentWorkspace extends IAgentWorkspace {
  async initialize(_name: string): Promise<void> {
    return;
  }
  async start(): Promise<void> {
    return;
  }
  async stop(): Promise<void> {
    return;
  }
  async restart(): Promise<void> {
    return;
  }
  async pause(): Promise<void> {
    return;
  }
  async resume(): Promise<void> {
    return;
  }
  async terminate(): Promise<void> {
    return;
  }
  async getStatus(): Promise<string> {
    return 'running';
  }
  async run(_command: string): Promise<string> {
    return 'command executed';
  }
  async getLogs(): Promise<string[]> {
    return [];
  }
  async getErrors(): Promise<string[]> {
    return [];
  }
  async getWarnings(): Promise<string[]> {
    return [];
  }
  async getInfo(): Promise<string[]> {
    return [];
  }

  async getDebug(): Promise<string[]> {
    return [];
  }
  async getTrace(): Promise<string[]> {
    return [];
  }
  async getVerbose(): Promise<string[]> {
    return [];
  }
}
