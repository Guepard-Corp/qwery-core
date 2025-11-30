import { StateMachineFlow } from '../../src/components/state-machine-flow';
import type { StateMachineDefinition } from '@qwery/domain/entities';

// Example state machine from the test
const exampleStateMachine: StateMachineDefinition = {
  id: 'fsm.text-to-sql.v1',
  name: 'Text to SQL State Machine',
  initialPhase: 'idle',
  terminalPhases: new Set(['done', 'error']),
  transitions: [
    { from: 'idle', command: 'start', to: 'detect-intent' },
    { from: 'detect-intent', command: 'generate-schema', to: 'extract-schema' },
    { from: 'extract-schema', command: 'plan-query', to: 'plan-query' },
    { from: 'plan-query', command: 'execute-query', to: 'execute-query' },
    { from: 'execute-query', command: 'complete', to: 'done' },
    { from: 'detect-intent', command: 'error', to: 'error' },
    { from: 'extract-schema', command: 'error', to: 'error' },
    { from: 'plan-query', command: 'error', to: 'error' },
    { from: 'execute-query', command: 'error', to: 'error' },
  ],
};

export default function Index() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="mb-4 text-3xl font-bold">State Machine Visualizer</h1>
      <div className="mb-4">
        <p className="text-muted-foreground">
          Visualizing: {exampleStateMachine.name}
        </p>
      </div>
      <StateMachineFlow stateMachine={exampleStateMachine} />
    </div>
  );
}
