import type { Meta, StoryObj } from '@storybook/react';
import { Canvas } from './canvas';
import { Node, NodeHeader, NodeTitle, NodeContent } from './node';
import { Edge } from './edge';
import { useCallback, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  type Connection,
  type Edge as ReactFlowEdge,
  type Node as ReactFlowNode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const meta: Meta<typeof Canvas> = {
  title: 'AI Elements/Canvas',
  component: Canvas,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof Canvas>;

const initialNodes: ReactFlowNode[] = [
  {
    id: '1',
    type: 'default',
    position: { x: 100, y: 100 },
    data: { label: 'Start' },
  },
  {
    id: '2',
    type: 'default',
    position: { x: 300, y: 100 },
    data: { label: 'Process' },
  },
  {
    id: '3',
    type: 'default',
    position: { x: 500, y: 100 },
    data: { label: 'End' },
  },
];

const initialEdges: ReactFlowEdge[] = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e2-3', source: '2', target: '3' },
];

export const Simple: Story = {
  render: () => {
    const [nodes, setNodes] = useState(initialNodes);
    const [edges, setEdges] = useState(initialEdges);

    const onConnect = useCallback(
      (params: Connection) => setEdges((eds) => addEdge(params, eds)),
      [],
    );

    return (
      <div className="h-screen w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onConnect={onConnect}
          deleteKeyCode={['Backspace', 'Delete']}
          fitView
          panOnDrag={false}
          panOnScroll
          selectionOnDrag={true}
          zoomOnDoubleClick={false}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    );
  },
};

export const WithCustomNodes: Story = {
  render: () => {
    const [nodes, setNodes] = useState<ReactFlowNode[]>([
      {
        id: '1',
        type: 'custom',
        position: { x: 100, y: 100 },
        data: {
          label: (
            <Node handles={{ source: true, target: false }}>
              <NodeHeader>
                <NodeTitle>Input Node</NodeTitle>
              </NodeHeader>
              <NodeContent>This is an input node</NodeContent>
            </Node>
          ),
        },
      },
      {
        id: '2',
        type: 'custom',
        position: { x: 400, y: 100 },
        data: {
          label: (
            <Node handles={{ source: true, target: true }}>
              <NodeHeader>
                <NodeTitle>Process Node</NodeTitle>
              </NodeHeader>
              <NodeContent>This is a process node</NodeContent>
            </Node>
          ),
        },
      },
    ]);
    const [edges, setEdges] = useState<ReactFlowEdge[]>([]);

    const onConnect = useCallback(
      (params: Connection) => setEdges((eds) => addEdge(params, eds)),
      [],
    );

    return (
      <div className="h-screen w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onConnect={onConnect}
          deleteKeyCode={['Backspace', 'Delete']}
          fitView
          panOnDrag={false}
          panOnScroll
          selectionOnDrag={true}
          zoomOnDoubleClick={false}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    );
  },
};

