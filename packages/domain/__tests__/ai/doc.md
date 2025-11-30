import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApplyAgentCommandService } from '../../src/services/ai/apply-agent-command.service';
import type { AgentSession } from '../../src/entities/ai/agent-session.type';
import type { StateMachineDefinition } from '../../src/entities/ai/state-machine.type';
import {
  MockAgentSessionRepository,
  MockStateMachineRepository,
  MockAgentSideEffects,
  MockAgentWorkspace,
  MockAgentMemory,
  MockAIModel,
} from '../mocks/agent.mock';
import { z } from 'zod';
import { Tool } from '../../src/entities/ai/tool.type';
import { AgentFactory } from '../../src/services/ai/agent-factory';



describe('ChatAgentMultiturn', () => {
  let agentSessionRepository: MockAgentSessionRepository;
  let stateMachineRepository: MockStateMachineRepository;
  let agentSideEffects: MockAgentSideEffects;
  let service: ApplyAgentCommandService;

  beforeEach(() => {
    agentSessionRepository = new MockAgentSessionRepository();
    stateMachineRepository = new MockStateMachineRepository();
    agentSideEffects = new MockAgentSideEffects();
    service = new ApplyAgentCommandService(
      agentSessionRepository,
      stateMachineRepository,
      agentSideEffects
    );
  });

  describe('state machine transitions', () => {
    it('should transition from idle to working when start command is applied', async () => {
      // Create a simple state machine: idle -> (start) -> working -> (complete) -> done

      const getSchema  = await AgentFactory.createTool({
        name: 'getSchema',
        description: 'Get the schema of the database',
        parameters: z.object({
          query: z.string(),
        }),
        handler: async () => {
          return "There are 100 users in the database.";
        },
      });
      const tools = [getSchema];

      const workspace = new MockAgentWorkspace();
      const memory = new MockAgentMemory();
      const model = new MockAIModel();

      const stateMachine: StateMachineDefinition = {
        id: 'fsm.text-to-sql.v1',
        name: 'Text to SQL State Machine',
        initialPhase: 'idle',
        terminalPhases: new Set(['done', 'error']),
        transitions: [
          { from: 'idle', command: 'start', to: 'detect-intent' },
          { from: 'detect-intent', command: 'intent-detected', to: 'summarize-intent' },
          { from: 'detect-intent', command: 'intent-not-clear', to: 'resolve-intent' },
          { from: 'detect-intent', command: 'needs-context', to: 'gather-context' },
          { from: 'gather-context', command: 'context-gathered', to: 'detect-intent' },
          { from: 'resolve-intent', command: 'intent-resolved', to: 'summarize-intent' },
          { from: 'resolve-intent', command: 'intent-not-resolved', to: 'resolve-intent' },
          { from: 'summarize-intent', command: 'intent-confirmed', to: 'create-task' },
          { from: 'summarize-intent', command: 'intent-not-confirmed', to: 'resolve-intent' },
          { from: 'create-task', command: 'task-created', to: 'execute-task' },
          { from: 'execute-task', command: 'task-executed', to: 'done' },
        ],
      }

      const simpleStateMachine: StateMachineDefinition = {
        id: 'fsm.text-to-sql.v1',
        name: 'Text to SQL State Machine',
        initialPhase: 'idle',
        terminalPhases: new Set(['done', 'error']),
        transitions: [
          { from: 'idle', command: 'start', to: 'say-hello' },
          { from: 'say-hello', command: 'say-hello', to: 'done' },
        ],
      }

      const factoryOps = {
        main_model: {
          name: "gpt-5-mini",
          temperature: 0.1,
        },
        weak_model: {
          name: "gpt-4o",
          temperature: 0.1,
        },
      }

      const factory = new AgentFactory();

      const agent = factory.buildAgent({
        name: "planner",
      });
  
      //const answer = await agent.run("How many users are there in the database?");
      const answer = await agent.run("Hi agent");
  
      //expect(answer).toBe("There are 100 users in the database.");
      expect(answer).toBe("Hello");
    });
  });
});

