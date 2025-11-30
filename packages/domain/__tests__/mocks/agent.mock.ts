import { v4 as uuidv4 } from 'uuid';
import { IAgentSessionRepository } from '../../src/repositories';
import { AgentSession } from '../../src/entities';
import { StateMachineRepositoryPort } from '../../src/repositories';
import { StateMachineDefinition } from '../../src/entities';
import { AgentSideEffectsPort } from '../../src/ports/agent-side-effects.port';
import { AIModelPort } from '../../src/ports/ai-model.port';
import { AgentMemoryPort } from '../../src/ports/agent-memory.port';
import { AgentWorkspacePort } from '../../src/ports/agent-workspace.port';
import { Message, MessageRole } from '../../src/entities';

export class MockAgentSessionRepository implements IAgentSessionRepository {
  private sessions = new Map<string, AgentSession>();

  async findAll() {
    return Array.from(this.sessions.values());
  }

  async findById(id: string) {
    return this.sessions.get(id) ?? null;
  }

  async findBySlug(_slug: string) {
    return null;
  }

  async create(entity: AgentSession) {
    this.sessions.set(entity.sessionId, entity);
    return entity;
  }

  async update(entity: AgentSession) {
    if (!this.sessions.has(entity.sessionId)) {
      throw new Error(`Session with id ${entity.sessionId} not found`);
    }
    this.sessions.set(entity.sessionId, entity);
    return entity;
  }

  async delete(id: string) {
    return this.sessions.delete(id);
  }

  shortenId(id: string) {
    return id.slice(0, 8);
  }
}

export class MockStateMachineRepository implements StateMachineRepositoryPort {
  private machines = new Map<string, StateMachineDefinition>();

  async findAll() {
    return Array.from(this.machines.values());
  }

  async findById(id: string) {
    return this.machines.get(id) ?? null;
  }

  async findBySlug(_slug: string) {
    return null;
  }

  async create(entity: StateMachineDefinition) {
    this.machines.set(entity.id, entity);
    return entity;
  }

  async update(entity: StateMachineDefinition) {
    if (!this.machines.has(entity.id)) {
      throw new Error(`State machine with id ${entity.id} not found`);
    }
    this.machines.set(entity.id, entity);
    return entity;
  }

  async delete(id: string) {
    return this.machines.delete(id);
  }

  shortenId(id: string) {
    return id.slice(0, 8);
  }
}

export class MockAgentSideEffects extends AgentSideEffectsPort {
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

export class MockAIModel extends AIModelPort {
  public startCalls = 0;
  public stepCalls = 0;
  public initializedWith: {
    model: string;
    streaming: boolean;
    visual: boolean;
    meta: Record<string, unknown>;
  } | null = null;

  private readonly conversationId = uuidv4();

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

  private createMessage(
    content: string,
    role: MessageRole = MessageRole.ASSISTANT,
  ): Message {
    const now = new Date();

    return {
      id: uuidv4(),
      conversationId: this.conversationId,
      content,
      role,
      metadata: {},
      createdAt: now,
      updatedAt: now,
      createdBy: 'mock-ai',
      updatedBy: 'mock-ai',
    };
  }
}

export class MockAgentMemory extends AgentMemoryPort {
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

export class MockAgentWorkspace extends AgentWorkspacePort {
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
