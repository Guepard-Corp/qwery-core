import type { Meta, StoryObj } from '@storybook/react';
import { Toolbar } from './toolbar';
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
import { Node as CustomNode, NodeHeader, NodeTitle, NodeContent } from './node';

const meta: Meta<typeof Toolbar> = {
  title: 'AI Elements/Toolbar',
  component: Toolbar,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof Toolbar>;

const CustomNodeComponent = ({
  data,
  selected,
}: {
  data: any;
  selected?: boolean;
}) => {
  return data.label;
};

const nodeTypes = {
  custom: CustomNodeComponent,
};

export const Simple: Story = {
  render: () => {
    const [nodes] = useState<Node[]>([
      {
        id: '1',
        type: 'custom',
        position: { x: 100, y: 100 },
        data: {
          label: (
            <CustomNode handles={{ source: true, target: true }}>
              <NodeHeader>
                <NodeTitle>Node with Toolbar</NodeTitle>
              </NodeHeader>
              <NodeContent>
                <p className="text-sm">
                  Hover or select this node to see the toolbar
                </p>
              </NodeContent>
              <Toolbar>
                <Button size="sm" variant="ghost">
                  Edit
                </Button>
                <Button size="sm" variant="ghost">
                  Delete
                </Button>
              </Toolbar>
            </CustomNode>
          ),
        },
      },
    ]);

    return (
      <div className="h-screen w-full">
        <ReactFlow nodes={nodes} nodeTypes={nodeTypes} fitView>
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    );
  },
};

export const MultipleNodes: Story = {
  render: () => {
    const [nodes] = useState<Node[]>([
      {
        id: '1',
        type: 'custom',
        position: { x: 50, y: 50 },
        data: {
          label: (
            <CustomNode handles={{ source: true, target: true }}>
              <NodeHeader>
                <NodeTitle>Node 1</NodeTitle>
              </NodeHeader>
              <NodeContent>
                <p className="text-sm">First node</p>
              </NodeContent>
              <Toolbar>
                <Button size="sm" variant="ghost">
                  Action
                </Button>
              </Toolbar>
            </CustomNode>
          ),
        },
      },
      {
        id: '2',
        type: 'custom',
        position: { x: 300, y: 50 },
        data: {
          label: (
            <CustomNode handles={{ source: true, target: true }}>
              <NodeHeader>
                <NodeTitle>Node 2</NodeTitle>
              </NodeHeader>
              <NodeContent>
                <p className="text-sm">Second node</p>
              </NodeContent>
              <Toolbar>
                <Button size="sm" variant="ghost">
                  Action
                </Button>
              </Toolbar>
            </CustomNode>
          ),
        },
      },
    ]);

    return (
      <div className="h-screen w-full">
        <ReactFlow nodes={nodes} nodeTypes={nodeTypes} fitView>
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    );
  },
};
