import { useMemo } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { StateMachineDefinition } from '@qwery/domain/entities';
import { Badge } from '@qwery/ui/badge';
import { cn } from '@qwery/ui/utils';
import {
  Canvas,
  Edge as EdgeComponent,
  Node as NodeComponent,
  NodeHeader,
  NodeTitle,
  NodeDescription,
} from '@qwery/ui/ai-elements';
import '@xyflow/react/dist/style.css';

type PhaseNodeData = {
  label: string;
  description?: string;
  handles: { target: boolean; source: boolean };
  isInitial: boolean;
  isTerminal: boolean;
};

type PhaseNode = Node<PhaseNodeData, 'phase'>;

function PhaseNode({ data }: { data: PhaseNodeData }) {
  return (
    <NodeComponent
      handles={data.handles}
      className={cn(
        'w-[160px] max-w-[160px]',
        data.isInitial && 'border-primary border-2',
        data.isTerminal && 'border-destructive border-2',
      )}
    >
      <NodeHeader className="p-2">
        <NodeTitle className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
          <span className="truncate">{data.label}</span>
          {data.isInitial && (
            <Badge variant="default" className="px-1 py-0 text-[10px]">
              Start
            </Badge>
          )}
          {data.isTerminal && (
            <Badge variant="destructive" className="px-1 py-0 text-[10px]">
              End
            </Badge>
          )}
        </NodeTitle>
        {data.description && (
          <NodeDescription className="text-[10px]">
            {data.description}
          </NodeDescription>
        )}
      </NodeHeader>
    </NodeComponent>
  );
}

const nodeTypes = {
  phase: PhaseNode,
};

const edgeTypes = {
  animated: EdgeComponent.Animated,
  transition: EdgeComponent.Animated,
};

function calculateLayout(stateMachine: StateMachineDefinition): {
  nodes: PhaseNode[];
  edges: Edge[];
} {
  const nodes: PhaseNode[] = [];
  const edges: Edge[] = [];
  const phasePositions = new Map<string, { x: number; y: number }>();
  const phaseLevels = new Map<string, number>();

  // Collect all unique phases
  const phases = new Set<string>();
  phases.add(stateMachine.initialPhase);
  stateMachine.terminalPhases.forEach((phase: string) => phases.add(phase));
  stateMachine.transitions.forEach((transition) => {
    phases.add(transition.from);
    phases.add(transition.to);
  });

  // Simple BFS to assign levels
  const visited = new Set<string>();
  const queue: Array<{ phase: string; level: number }> = [
    { phase: stateMachine.initialPhase, level: 0 },
  ];

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) break;
    const { phase, level } = item;
    if (visited.has(phase)) {
      const existingLevel = phaseLevels.get(phase);
      if (existingLevel !== undefined) {
        phaseLevels.set(phase, Math.max(existingLevel, level));
      }
      continue;
    }

    visited.add(phase);
    phaseLevels.set(phase, level);

    // Find all transitions from this phase
    const outgoingTransitions = stateMachine.transitions.filter(
      (t: { from: string; command: string; to: string }) => t.from === phase,
    );

    for (const transition of outgoingTransitions) {
      if (!visited.has(transition.to)) {
        queue.push({ phase: transition.to, level: level + 1 });
      }
    }
  }

  // Assign positions based on levels
  const levelGroups = new Map<number, string[]>();
  phaseLevels.forEach((level, phase) => {
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    const group = levelGroups.get(level);
    if (group) {
      group.push(phase);
    }
  });

  const horizontalSpacing = 250;
  const verticalSpacing = 120;

  levelGroups.forEach((phasesInLevel, level) => {
    const count = phasesInLevel.length;
    const startY = -(count * verticalSpacing) / 2;
    phasesInLevel.forEach((phase, index) => {
      phasePositions.set(phase, {
        x: level * horizontalSpacing,
        y: startY + index * verticalSpacing,
      });
    });
  });

  // Create nodes
  phases.forEach((phase) => {
    const position = phasePositions.get(phase) || { x: 0, y: 0 };
    const isInitial = phase === stateMachine.initialPhase;
    const isTerminal = stateMachine.terminalPhases.has(phase);

    // Determine handles based on transitions
    const hasIncoming = stateMachine.transitions.some((t) => t.to === phase);
    const hasOutgoing = stateMachine.transitions.some((t) => t.from === phase);

    nodes.push({
      id: phase,
      type: 'phase',
      position,
      data: {
        label: phase,
        description: isInitial
          ? 'Initial state'
          : isTerminal
            ? 'Terminal state'
            : undefined,
        handles: {
          target: hasIncoming || isInitial,
          source: hasOutgoing || isTerminal,
        },
        isInitial,
        isTerminal,
      },
    });
  });

  // Create edges
  stateMachine.transitions.forEach((transition, index: number) => {
    edges.push({
      id: `edge-${index}`,
      source: transition.from,
      target: transition.to,
      type: 'animated',
    });
  });

  return { nodes, edges };
}

export type StateMachineFlowProps = {
  stateMachine: StateMachineDefinition;
  className?: string;
};

export function StateMachineFlow({
  stateMachine,
  className,
}: StateMachineFlowProps) {
  const { nodes, edges } = useMemo(
    () => calculateLayout(stateMachine),
    [stateMachine],
  );

  return (
    <div className={cn('h-[600px] w-full', className)}>
      <Canvas
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
      />
    </div>
  );
}
