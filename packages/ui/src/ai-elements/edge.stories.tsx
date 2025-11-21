import type { Meta, StoryObj } from '@storybook/react';
import { Edge } from './edge';
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge as ReactFlowEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useState } from 'react';

const meta: Meta<typeof Edge> = {
  title: 'AI Elements/Edge',
  component: Edge.Temporary,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof Edge.Temporary>;

const edgeTypes = {
  temporary: Edge.Temporary,
  animated: Edge.Animated,
};

export const Temporary: Story = {
  render: () => {
    const [nodes] = useState<Node[]>([
      {
        id: '1',
        type: 'default',
        position: { x: 100, y: 100 },
        data: { label: 'Source' },
      },
      {
        id: '2',
        type: 'default',
        position: { x: 300, y: 200 },
        data: { label: 'Target' },
      },
    ]);
    const [edges] = useState<ReactFlowEdge[]>([
      {
        id: 'e1-2',
        source: '1',
        target: '2',
        type: 'temporary',
      },
    ]);

    return (
      <div className="h-screen w-full">
        <ReactFlow nodes={nodes} edges={edges} edgeTypes={edgeTypes} fitView>
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    );
  },
};

export const Animated: Story = {
  render: () => {
    const [nodes] = useState<Node[]>([
      {
        id: '1',
        type: 'default',
        position: { x: 100, y: 100 },
        data: { label: 'Source' },
      },
      {
        id: '2',
        type: 'default',
        position: { x: 300, y: 200 },
        data: { label: 'Target' },
      },
    ]);
    const [edges] = useState<ReactFlowEdge[]>([
      {
        id: 'e1-2',
        source: '1',
        target: '2',
        type: 'animated',
        markerEnd: {
          type: 'arrowclosed',
        },
      },
    ]);

    return (
      <div className="h-screen w-full">
        <ReactFlow nodes={nodes} edges={edges} edgeTypes={edgeTypes} fitView>
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    );
  },
};

export const MultipleEdges: Story = {
  render: () => {
    const [nodes] = useState<Node[]>([
      {
        id: '1',
        type: 'default',
        position: { x: 100, y: 100 },
        data: { label: 'Node 1' },
      },
      {
        id: '2',
        type: 'default',
        position: { x: 300, y: 100 },
        data: { label: 'Node 2' },
      },
      {
        id: '3',
        type: 'default',
        position: { x: 500, y: 100 },
        data: { label: 'Node 3' },
      },
    ]);
    const [edges] = useState<ReactFlowEdge[]>([
      {
        id: 'e1-2',
        source: '1',
        target: '2',
        type: 'animated',
        markerEnd: {
          type: 'arrowclosed',
        },
      },
      {
        id: 'e2-3',
        source: '2',
        target: '3',
        type: 'temporary',
      },
    ]);

    return (
      <div className="h-screen w-full">
        <ReactFlow nodes={nodes} edges={edges} edgeTypes={edgeTypes} fitView>
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    );
  },
};
