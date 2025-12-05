import type { Meta, StoryObj } from '@storybook/react';
import { Connection } from './connection';
import { ReactFlow, Background, Controls, type EdgeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useState } from 'react';

const meta: Meta<typeof Connection> = {
  title: 'AI Elements/Connection',
  component: Connection,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof Connection>;

const CustomConnectionLine = (props: EdgeProps) => {
  return <Connection {...props} />;
};

const initialNodes = [
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

const initialEdges = [
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
        <ReactFlow
          nodes={nodes}
          edges={edges}
          connectionLineComponent={CustomConnectionLine}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    );
  },
};

export const MultipleConnections: Story = {
  render: () => {
    const [nodes] = useState([
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
        data: { label: 'Process 1' },
      },
      {
        id: '3',
        type: 'default',
        position: { x: 300, y: 250 },
        data: { label: 'Process 2' },
      },
      {
        id: '4',
        type: 'default',
        position: { x: 500, y: 175 },
        data: { label: 'End' },
      },
    ]);
    const [edges] = useState([
      { id: 'e1-2', source: '1', target: '2' },
      { id: 'e1-3', source: '1', target: '3' },
      { id: 'e2-4', source: '2', target: '4' },
      { id: 'e3-4', source: '3', target: '4' },
    ]);

    return (
      <div className="h-screen w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          connectionLineComponent={CustomConnectionLine}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    );
  },
};
