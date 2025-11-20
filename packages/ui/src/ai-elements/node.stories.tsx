import type { Meta, StoryObj } from '@storybook/react';
import {
  Node,
  NodeHeader,
  NodeTitle,
  NodeDescription,
  NodeContent,
  NodeFooter,
  NodeAction,
} from './node';
import { ReactFlow, Background, Controls, type Node as ReactFlowNode } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useState } from 'react';
import { Button } from '../shadcn/button';

const meta: Meta<typeof Node> = {
  title: 'AI Elements/Node',
  component: Node,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof Node>;

const CustomNodeComponent = ({ data }: { data: any }) => {
  return data.label;
};

const nodeTypes = {
  custom: CustomNodeComponent,
};

export const Simple: Story = {
  render: () => {
    const [nodes] = useState<ReactFlowNode[]>([
      {
        id: '1',
        type: 'custom',
        position: { x: 100, y: 100 },
        data: {
          label: (
            <Node handles={{ source: true, target: false }}>
              <NodeHeader>
                <NodeTitle>Input Node</NodeTitle>
                <NodeDescription>This is an input node</NodeDescription>
              </NodeHeader>
              <NodeContent>
                <p className="text-sm">Node content goes here</p>
              </NodeContent>
            </Node>
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

export const WithActions: Story = {
  render: () => {
    const [nodes] = useState<ReactFlowNode[]>([
      {
        id: '1',
        type: 'custom',
        position: { x: 100, y: 100 },
        data: {
          label: (
            <Node handles={{ source: true, target: true }}>
              <NodeHeader>
                <div className="flex items-center justify-between w-full">
                  <div>
                    <NodeTitle>Process Node</NodeTitle>
                    <NodeDescription>Node with actions</NodeDescription>
                  </div>
                  <NodeAction>
                    <Button size="sm" variant="ghost">
                      Action
                    </Button>
                  </NodeAction>
                </div>
              </NodeHeader>
              <NodeContent>
                <p className="text-sm">This node has action buttons</p>
              </NodeContent>
            </Node>
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

export const WithFooter: Story = {
  render: () => {
    const [nodes] = useState<ReactFlowNode[]>([
      {
        id: '1',
        type: 'custom',
        position: { x: 100, y: 100 },
        data: {
          label: (
            <Node handles={{ source: true, target: true }}>
              <NodeHeader>
                <NodeTitle>Complete Node</NodeTitle>
                <NodeDescription>Node with all sections</NodeDescription>
              </NodeHeader>
              <NodeContent>
                <p className="text-sm">Main content area</p>
              </NodeContent>
              <NodeFooter>
                <p className="text-xs text-muted-foreground">Footer content</p>
              </NodeFooter>
            </Node>
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
    const [nodes] = useState<ReactFlowNode[]>([
      {
        id: '1',
        type: 'custom',
        position: { x: 50, y: 50 },
        data: {
          label: (
            <Node handles={{ source: true, target: false }}>
              <NodeHeader>
                <NodeTitle>Start</NodeTitle>
              </NodeHeader>
              <NodeContent>
                <p className="text-sm">Starting node</p>
              </NodeContent>
            </Node>
          ),
        },
      },
      {
        id: '2',
        type: 'custom',
        position: { x: 300, y: 50 },
        data: {
          label: (
            <Node handles={{ source: true, target: true }}>
              <NodeHeader>
                <NodeTitle>Process</NodeTitle>
              </NodeHeader>
              <NodeContent>
                <p className="text-sm">Processing node</p>
              </NodeContent>
            </Node>
          ),
        },
      },
      {
        id: '3',
        type: 'custom',
        position: { x: 550, y: 50 },
        data: {
          label: (
            <Node handles={{ source: false, target: true }}>
              <NodeHeader>
                <NodeTitle>End</NodeTitle>
              </NodeHeader>
              <NodeContent>
                <p className="text-sm">Ending node</p>
              </NodeContent>
            </Node>
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

