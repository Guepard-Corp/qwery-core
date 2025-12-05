import type { Meta, StoryObj } from '@storybook/react';
import { Panel } from './panel';
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useState } from 'react';
import { Button } from '../shadcn/button';

const meta: Meta<typeof Panel> = {
  title: 'AI Elements/Panel',
  component: Panel,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof Panel>;

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
          <Panel position="top-left">
            <Button size="sm">Action 1</Button>
          </Panel>
          <Panel position="top-right">
            <Button size="sm">Action 2</Button>
          </Panel>
        </ReactFlow>
      </div>
    );
  },
};

export const MultiplePanels: Story = {
  render: () => {
    const [nodes] = useState(initialNodes);
    const [edges] = useState(initialEdges);

    return (
      <div className="h-screen w-full">
        <ReactFlow nodes={nodes} edges={edges} fitView>
          <Background />
          <Controls />
          <Panel position="top-left">
            <div className="flex gap-2">
              <Button size="sm">Save</Button>
              <Button size="sm" variant="outline">
                Load
              </Button>
            </div>
          </Panel>
          <Panel position="top-right">
            <Button size="sm" variant="outline">
              Settings
            </Button>
          </Panel>
          <Panel position="bottom-left">
            <div className="text-muted-foreground text-xs">
              <p>Node count: {nodes.length}</p>
              <p>Edge count: {edges.length}</p>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    );
  },
};
