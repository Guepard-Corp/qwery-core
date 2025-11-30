import { Message } from './message.type';

export type PhaseId = string;
export type CommandId = string;

export type StateData = Record<string, unknown>;

export class AgentResult {
  constructor(
    public readonly toolCallId: string,
    public readonly toolName: string,
    public readonly result: unknown,
    public readonly error?: string,
  ) {
    this.toolCallId = toolCallId;
    this.toolName = toolName;
    this.result = result;
    this.error = error;
  }
}
export type StateConstructor<T extends StateData> = {
  /**
   * Data represents initial typed data
   */
  data?: T;

  /**
   * Results represents any previous AgentResult entries for
   * conversation history and memory.
   */
  results?: AgentResult[];

  /**
   * Messages allows you to pas custom messages which will be appended
   * after the system and user message to each agent.
   */
  messages?: Message[];

  /**
   * conversationId is the unique identifier for a conversation thread.
   */
  conversationId?: string;
};

/**
 * A transition definition is a collection of a from state, a command, and a to state.
 */
export interface TransitionDefinition {
  from: PhaseId;
  command: CommandId;
  to: PhaseId;
}

/**
 * An agent state machine definition is a collection of states, commands, and transitions.
 */
export interface StateMachineDefinition<_TStateData extends StateData> {
  id: string;
  name: string;
  initialPhase: PhaseId;
  terminalPhases: Set<PhaseId>;
  transitions: TransitionDefinition[]; // (from, command) -> to
}
