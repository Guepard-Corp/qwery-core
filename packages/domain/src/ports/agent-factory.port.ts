import { v4 as uuidv4 } from 'uuid';
import { AgentSession } from '../entities';
import {
  CommandId,
  PhaseId,
  StateConstructor,
  StateData,
  StateMachineDefinition,
} from '../entities';
import { Message, MessageRole } from '../entities';
import { type ToolAny } from '../entities';
import { AIModelPort, IAiModel } from './ai-model.port';
import { AgentMemoryPort } from './agent-memory.port';
import { AgentWorkspacePort } from './agent-workspace.port';
import { AgentSideEffectsPort } from './agent-side-effects.port';

export type AgentFactoryDependencies = {
  aiModelPort: AIModelPort;
  memory?: AgentMemoryPort;
  workspace?: AgentWorkspacePort;
  sideEffects?: AgentSideEffectsPort;
};

type AgentRunnerDependencies = {
  aiModelPort: AIModelPort;
  memory?: AgentMemoryPort;
  workspace?: AgentWorkspacePort;
  sideEffects?: AgentSideEffectsPort;
};

export class AgentRunner<T extends StateData> {
  name: string;
  description: string;
  system: string;
  model: IAiModel;
  tools: Map<string, ToolAny>;
  stateMachine: StateMachineDefinition<T>;

  private readonly aiModelPort: AIModelPort;
  private readonly memory?: AgentMemoryPort;
  private readonly workspace?: AgentWorkspacePort;
  private readonly sideEffects?: AgentSideEffectsPort;
  private readonly initialization: Promise<void>;
  private readonly conversationId: string;
  private readonly requiresCommand: boolean;
  private session: AgentSession;
  private phase: PhaseId;
  private history: Message[] = [];
  private started = false;

  constructor(
    private readonly opts: AgentConstructor<T>,
    dependencies: AgentRunnerDependencies,
  ) {
    this.aiModelPort = dependencies.aiModelPort;
    this.memory = dependencies.memory;
    this.workspace = dependencies.workspace;
    this.sideEffects = dependencies.sideEffects;

    this.name = opts.name;
    this.description = opts.description ?? '';
    this.system = opts.system ?? '';
    this.tools = opts.tools ?? new Map();
    this.model = opts.model;
    this.stateMachine =
      opts.stateMachine ?? AgentRunner.defaultStateMachine<T>();
    this.requiresCommand = Boolean(opts.stateMachine);
    this.phase = this.stateMachine.initialPhase;

    this.conversationId = opts.state?.conversationId ?? uuidv4();
    this.session = this.createInitialSession(opts.session);
    this.initialization = this.initializeResources();
  }

  async run(input: Message | string, command?: CommandId): Promise<string> {
    const resolvedCommand = command ?? this.autoCommand();

    await this.initialization;
    const normalizedInput = this.normalizeMessage(input);

    this.history.push(normalizedInput);
    const messages = await this.generateReply(normalizedInput);

    const reply = messages[messages.length - 1]?.content ?? '';
    const { from, to } = this.transition(resolvedCommand);
    await this.emitSideEffects(from, to, resolvedCommand);

    return reply;
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
        sessionId: uuidv4(),
        agentId: this.name,
        fsmId: this.stateMachine.id,
        phase: this.phase,
        taskId: uuidv4(),
        retryCount: 0,
        metadata: {},
      }
    );
  }

  private normalizeMessage(input: Message | string): Message {
    if (typeof input !== 'string') {
      return input;
    }

    return this.createMessage(MessageRole.USER, input);
  }

  private async generateReply(userMessage: Message): Promise<Message[]> {
    if (!this.started) {
      this.started = true;
      if (this.system) {
        this.history.unshift(
          this.createMessage(MessageRole.SYSTEM, this.system),
        );
      }
      await this.aiModelPort.initialize(this.model.name, false, false, {
        temperature: this.model.temperature,
      });
      const startMessages = await this.aiModelPort.start(
        this.system ?? '',
        userMessage.content,
      );
      this.history.push(...startMessages);
      return startMessages;
    }

    const stepMessages = await this.aiModelPort.step(
      this.history,
      userMessage.content,
    );
    this.history.push(...stepMessages);
    return stepMessages;
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
    await this.opts.onTransition?.(this.session, from, to, command);
    await this.sideEffects?.onTransition?.(this.session, from, to, command);

    if (this.stateMachine.terminalPhases.has(to)) {
      await this.opts.onTerminalState?.(this.session, to);
      await this.sideEffects?.onTerminalState?.(this.session, to);
    }
  }

  private createMessage(role: MessageRole, content: string): Message {
    const now = new Date();

    return {
      id: uuidv4(),
      conversationId: this.conversationId,
      content,
      role,
      metadata: {},
      createdAt: now,
      updatedAt: now,
      createdBy: this.name,
      updatedBy: this.name,
    };
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

export type AgentConstructor<T extends StateData> = {
  name: string;
  description?: string;
  system?: string;
  tools?: Map<string, ToolAny>;
  model: IAiModel;
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

export abstract class AgentFactoryPort {
  constructor(protected readonly dependencies: AgentFactoryDependencies) {}

  abstract buildAgent<T extends StateData>(
    opts: AgentConstructor<T>,
  ): AgentRunner<T>;

  abstract buildChatAgent<T extends StateData>(
    opts: AgentConstructor<T>,
  ): AgentRunner<T>;
}
