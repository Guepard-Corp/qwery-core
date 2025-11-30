import { nanoid } from 'nanoid';
import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { AgentSession } from '../domain/agent-session.type';
import {
  CommandId,
  PhaseId,
  StateConstructor,
  StateData,
  StateMachineDefinition,
} from '../domain/state-machine.type';
import { IAgentRunner } from '../ports/agent-runner.port';
import { IAgentSideEffects } from '../ports/agent-side-effects.port';
import { IAgentWorkspace } from '../ports/agent-workspace.port';
import { IAgentMemory } from '../ports/agent-memory.port';

type AiSdkAgentRunnerDependencies = {
  model: unknown; // AI SDK model
  memory?: IAgentMemory;
  workspace?: IAgentWorkspace;
  sideEffects?: IAgentSideEffects;
};

type AiSdkAgentRunnerOptions<T extends StateData> = {
  name: string;
  description?: string;
  system?: string;
  stateMachine?: StateMachineDefinition<T>;
  state?: StateConstructor<T>;
  session?: AgentSession;
  onTransition?: (
    session: AgentSession,
    from: PhaseId,
    to: PhaseId,
    command: CommandId,
  ) => void | Promise<void>;
  onTerminalState?: (
    session: AgentSession,
    phase: PhaseId,
  ) => void | Promise<void>;
};

export class AiSdkAgentRunner<
  T extends StateData = StateData,
> extends IAgentRunner<UIMessage, T> {
  name: string;
  description: string;
  system: string;
  stateMachine: StateMachineDefinition<T>;

  private readonly model: unknown;
  private readonly memory?: IAgentMemory;
  private readonly workspace?: IAgentWorkspace;
  private readonly sideEffects?: IAgentSideEffects;
  private readonly initialization: Promise<void>;
  private readonly conversationId: string;
  private readonly requiresCommand: boolean;
  private session: AgentSession;
  private phase: PhaseId;
  private history: UIMessage[] = [];
  private readonly onTransition?: (
    session: AgentSession,
    from: PhaseId,
    to: PhaseId,
    command: CommandId,
  ) => void | Promise<void>;
  private readonly onTerminalState?: (
    session: AgentSession,
    phase: PhaseId,
  ) => void | Promise<void>;

  constructor(
    options: AiSdkAgentRunnerOptions<T>,
    dependencies: AiSdkAgentRunnerDependencies,
  ) {
    super();
    this.model = dependencies.model;
    this.memory = dependencies.memory;
    this.workspace = dependencies.workspace;
    this.sideEffects = dependencies.sideEffects;

    this.name = options.name;
    this.description = options.description ?? '';
    this.system = options.system ?? '';
    this.stateMachine =
      options.stateMachine ?? AiSdkAgentRunner.defaultStateMachine<T>();
    this.requiresCommand = Boolean(options.stateMachine);
    this.phase = this.stateMachine.initialPhase;
    this.onTransition = options.onTransition;
    this.onTerminalState = options.onTerminalState;

    this.conversationId = options.state?.conversationId ?? nanoid();
    this.session = this.createInitialSession(options.session);
    this.initialization = this.initializeResources();
  }

  async run(input: UIMessage[], command?: CommandId): Promise<UIMessage[]> {
    const resolvedCommand = command ?? this.autoCommand();
    await this.initialization;

    if (input.length === 0) {
      return this.history;
    }

    // Update history with new messages
    this.updateHistory(input);
    const currentMessage = input[input.length - 1]!;
    const normalizedInput = this.normalizeMessage(currentMessage);

    // Use streaming and collect all messages
    const messages: UIMessage[] = [];
    for await (const update of this.runStream(
      [normalizedInput],
      resolvedCommand,
    )) {
      messages.push(...update);
    }

    return messages;
  }

  async *runStream(
    input: UIMessage[],
    command?: CommandId,
  ): AsyncGenerator<UIMessage[]> {
    const resolvedCommand = command ?? this.autoCommand();
    await this.initialization;

    if (input.length === 0) {
      yield this.history;
      return;
    }

    // Update history with new messages
    this.updateHistory(input);
    const currentMessage = input[input.length - 1]!;
    const normalizedInput = this.normalizeMessage(currentMessage);

    // Add user message to history for model context
    if (!this.history.find((m) => m.id === normalizedInput.id)) {
      this.history.push(normalizedInput);
    }

    // Use AI SDK's streaming - encapsulate the streamText pattern
    const result = streamText({
      model: this.model as never,
      system: this.system || undefined,
      messages: convertToModelMessages(this.history),
    });

    // Stream the response using AI SDK's textStream
    let buffer = '';
    const assistantMessageId = nanoid();

    for await (const chunk of result.textStream) {
      buffer += chunk;
      const assistantMessage: UIMessage = {
        id: assistantMessageId,
        role: 'assistant',
        parts: [{ type: 'text', text: buffer, state: 'streaming' }],
      };
      yield [...this.history, assistantMessage];
    }

    // Finalize the message
    const finalMessage: UIMessage = {
      id: assistantMessageId,
      role: 'assistant',
      parts: [{ type: 'text', text: buffer, state: 'done' }],
    };
    this.history.push(finalMessage);

    // Finalize and transition
    const { from, to } = this.transition(resolvedCommand);
    await this.emitSideEffects(from, to, resolvedCommand);
    yield [...this.history];
  }

  async getStreamResponse(
    input: UIMessage[],
    command?: CommandId,
  ): Promise<Response> {
    const resolvedCommand = command ?? this.autoCommand();
    await this.initialization;

    if (input.length === 0) {
      return new Response(null, { status: 200 });
    }

    // Update history with new messages
    this.updateHistory(input);
    const currentMessage = input[input.length - 1]!;
    const normalizedInput = this.normalizeMessage(currentMessage);

    // Add user message to history for model context
    if (!this.history.find((m) => m.id === normalizedInput.id)) {
      this.history.push(normalizedInput);
    }

    // Use AI SDK's toUIMessageStreamResponse - wrap AI SDK inside agent
    const result = streamText({
      model: this.model as never,
      system: this.system || undefined,
      messages: convertToModelMessages(this.history),
    });

    const streamResponse = await result.toUIMessageStreamResponse({
      sendSources: true,
      sendReasoning: true,
    });

    if (!streamResponse.body) {
      return streamResponse;
    }

    // Wrap the stream to handle transition after completion
    const originalReader = streamResponse.body.getReader();
    const wrappedStream = new ReadableStream({
      start: async (controller) => {
        try {
          while (true) {
            const { done, value } = await originalReader.read();
            if (done) {
              controller.close();
              break;
            }
            controller.enqueue(value);
          }
        } catch (error) {
          controller.error(error);
        } finally {
          originalReader.releaseLock();
          // Handle transition after streaming completes
          const { from, to } = this.transition(resolvedCommand);
          this.emitSideEffects(from, to, resolvedCommand);
        }
      },
    });

    return new Response(wrappedStream, {
      headers: streamResponse.headers,
      status: streamResponse.status,
      statusText: streamResponse.statusText,
    });
  }

  private async initializeResources(): Promise<void> {
    await Promise.all([
      this.memory?.initialize?.(this.name),
      this.workspace?.initialize?.(this.name),
    ]);
  }

  private createInitialSession(session?: AgentSession): AgentSession {
    return (
      session ?? {
        conversationId: this.conversationId,
        sessionId: nanoid(),
        agentId: this.name,
        fsmId: this.stateMachine.id,
        phase: this.phase,
        taskId: nanoid(),
        retryCount: 0,
        metadata: {},
      }
    );
  }

  private updateHistory(input: UIMessage[]): void {
    for (const message of input) {
      const normalized = this.normalizeMessage(message);
      if (!this.history.find((m) => m.id === normalized.id)) {
        this.history.push(normalized);
      }
    }
  }

  private normalizeMessage(input: UIMessage | string): UIMessage {
    if (typeof input === 'string') {
      return {
        id: nanoid(),
        role: 'user',
        parts: [{ type: 'text', text: input }],
      };
    }

    if (!input.id) {
      return {
        ...input,
        id: nanoid(),
      };
    }

    return input;
  }

  private transition(command: CommandId): { from: PhaseId; to: PhaseId } {
    const transition = this.stateMachine.transitions.find(
      (definition) =>
        definition.from === this.phase && definition.command === command,
    );

    if (!transition) {
      throw new Error(
        `No transition defined from phase '${this.phase}' with command '${command}'`,
      );
    }

    const from = this.phase;
    this.phase = transition.to;
    this.session = { ...this.session, phase: transition.to };
    return { from, to: transition.to };
  }

  private async emitSideEffects(
    from: PhaseId,
    to: PhaseId,
    command: CommandId,
  ): Promise<void> {
    await this.onTransition?.(this.session, from, to, command);
    await this.sideEffects?.onTransition?.(this.session, from, to, command);

    if (this.stateMachine.terminalPhases.has(to)) {
      await this.onTerminalState?.(this.session, to);
      await this.sideEffects?.onTerminalState?.(this.session, to);
    }
  }

  private autoCommand(): CommandId {
    if (this.requiresCommand) {
      throw new Error(
        'A command is required when using a custom state machine',
      );
    }

    const candidates = this.stateMachine.transitions.filter(
      (definition) => definition.from === this.phase,
    );

    if (candidates.length === 1) {
      return candidates[0]!.command;
    }

    if (candidates.length === 0) {
      throw new Error(
        `No transitions available from phase '${this.phase}'. Provide a command explicitly.`,
      );
    }

    throw new Error(
      `Multiple transitions available from phase '${this.phase}'. Provide a command explicitly.`,
    );
  }

  private static defaultStateMachine<
    T extends StateData,
  >(): StateMachineDefinition<T> {
    return {
      id: 'default',
      name: 'default',
      initialPhase: 'idle',
      terminalPhases: new Set(['responded']),
      transitions: [{ from: 'idle', command: 'respond', to: 'responded' }],
    };
  }
}
