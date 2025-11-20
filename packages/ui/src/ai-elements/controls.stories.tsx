import type { Meta, StoryObj } from '@storybook/react';
import { Controls } from './controls';
import { ReactFlow, Background, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useState } from 'react';

const meta: Meta<typeof Controls> = {
  title: 'AI Elements/Controls',
  component: Controls,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof Controls>;

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'default',
    position: { x: 100, y: 100 },
    data: { label: 'Node 1' },
  },
  {
    id: '2',
    type: 'default',
    position: { x: 300, y: 200 },
    data: { label: 'Node 2' },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
  },
];

export const Simple: Story = {
  render: () => {
    const [nodes] = useState(initialNodes);
    const [edges] = useState(initialEdges);

    return (
      <div className="h-screen w-full">
        <ReactFlow nodes={nodes} edges={edges} fitView>
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    );
  },
};

export const WithMultipleNodes: Story = {
  render: () => {
    const [nodes] = useState<Node[]>([
      {
        id: '1',
        type: 'default',
        position: { x: 50, y: 50 },
        data: { label: 'Start' },
      },
      {
        id: '2',
        type: 'default',
        position: { x: 250, y: 50 },
        data: { label: 'Process' },
      },
      {
        id: '3',
        type: 'default',
        position: { x: 450, y: 50 },
        data: { label: 'End' },
      },
    ]);
    const [edges] = useState<Edge[]>([
      { id: 'e1-2', source: '1', target: '2' },
      { id: 'e2-3', source: '2', target: '3' },
    ]);

    return (
      <div className="h-screen w-full">
        <ReactFlow nodes={nodes} edges={edges} fitView>
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    );
  },
};
