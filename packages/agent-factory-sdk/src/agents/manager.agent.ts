import {
  AgentFactory,
  StateData,
  StateMachineDefinition,
  UIMessage,
} from '../';
import { MANAGER_AGENT_PROMPT } from './manager.agent.prompt';
import { IAgentRunner } from '../ports/agent-runner.port';

const stateMachine: StateMachineDefinition<StateData> = {
  id: 'fsm.text-to-sql.v1',
  name: 'Text to SQL State Machine',
  initialPhase: 'idle',
  terminalPhases: new Set(['done', 'error']),
  transitions: [
    { from: 'idle', command: 'start', to: 'detect-intent' },
    {
      from: 'detect-intent',
      command: 'intent-detected',
      to: 'summarize-intent',
    },
    {
      from: 'detect-intent',
      command: 'intent-not-clear',
      to: 'resolve-intent',
    },
    { from: 'detect-intent', command: 'needs-context', to: 'gather-context' },
    {
      from: 'gather-context',
      command: 'context-gathered',
      to: 'detect-intent',
    },
    {
      from: 'resolve-intent',
      command: 'intent-resolved',
      to: 'summarize-intent',
    },
    {
      from: 'resolve-intent',
      command: 'intent-not-resolved',
      to: 'resolve-intent',
    },
    {
      from: 'summarize-intent',
      command: 'intent-confirmed',
      to: 'create-task',
    },
    {
      from: 'summarize-intent',
      command: 'intent-not-confirmed',
      to: 'resolve-intent',
    },
    { from: 'create-task', command: 'task-created', to: 'execute-task' },
    { from: 'execute-task', command: 'task-executed', to: 'done' },
  ],
};

export interface ManagerAgentOptions {
  conversationId: string;
}

export class ManagerAgent {
  private readonly factory = new AgentFactory();
  private readonly agent: IAgentRunner<UIMessage, StateData>;

  constructor(opts: ManagerAgentOptions) {
    this.agent = this.factory.buildAgent({
      conversationId: opts.conversationId,
      name: 'manager-agent',
      description: 'Manager agent',
      system: MANAGER_AGENT_PROMPT,
      stateMachine,
      model: {
        name: 'azure/gpt-5-mini',
      },
      onTransition: (session, from, to, command) => {
        console.log(
          `Transition from ${from} to ${to} with command ${command} with session ${JSON.stringify(session)}`,
        );
      },
      onTerminalState: (session, phase) => {
        console.log(
          `Terminal state ${phase} with session ${JSON.stringify(session)}`,
        );
      },
    });
  }

  getAgent(): IAgentRunner<UIMessage, StateData> {
    return this.agent;
  }
}
