import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AgentTabs, type AgentTab } from './agent-tabs';

const meta: Meta<typeof AgentTabs> = {
  title: 'Qwery/AI/Agent Tabs',
  component: AgentTabs,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof AgentTabs>;

const createTabs = (count: number): AgentTab[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `tab-${i + 1}`,
    title: `Tab ${i + 1}`,
    description: `Description for tab ${i + 1}`,
    component: (
      <div className="p-4">
        <h3 className="text-lg font-semibold">Content for Tab {i + 1}</h3>
        <p className="text-muted-foreground mt-2 text-sm">
          This is the content area for tab {i + 1}. You can render any React
          component here.
        </p>
      </div>
    ),
  }));
};

export const Default: Story = {
  args: {
    tabs: createTabs(3),
  },
};

function WithAddRemoveStory() {
  const [tabs, setTabs] = React.useState<AgentTab[]>(() => createTabs(2));

  const handleAdd = React.useCallback(() => {
    setTabs((current) => {
      const nextIndex = current.length + 1;
      const newTab: AgentTab = {
        id: `tab-${nextIndex}`,
        title: `Tab ${nextIndex}`,
        description: `Description for tab ${nextIndex}`,
        component: (
          <div className="p-4">
            <h3 className="text-lg font-semibold">
              Content for Tab {nextIndex}
            </h3>
            <p className="text-muted-foreground mt-2 text-sm">
              This is a newly added tab.
            </p>
          </div>
        ),
      };

      return [...current, newTab];
    });
  }, []);

  const handleRemove = React.useCallback((tabId: string) => {
    setTabs((current) => current.filter((tab) => tab.id !== tabId));
  }, []);

  return (
    <div className="h-[600px] w-[400px] border">
      <AgentTabs tabs={tabs} onTabAdd={handleAdd} onTabRemove={handleRemove} />
    </div>
  );
}

export const WithAddRemove: Story = {
  render: () => <WithAddRemoveStory />,
};

export const SingleTab: Story = {
  args: {
    tabs: createTabs(1),
  },
};

export const ManyTabs: Story = {
  args: {
    tabs: createTabs(5),
  },
};

export const WithoutDescriptions: Story = {
  args: {
    tabs: [
      {
        id: 'tab-1',
        title: 'Tab 1',
        component: <div className="p-4">Content 1</div>,
      },
      {
        id: 'tab-2',
        title: 'Tab 2',
        component: <div className="p-4">Content 2</div>,
      },
    ],
  },
};
