import type { Meta, StoryObj } from '@storybook/react';
import { WorkspaceModeSwitch } from './workspace-mode-switch';

const meta: Meta<typeof WorkspaceModeSwitch> = {
  title: 'Qwery/Workspace Mode Switch',
  component: WorkspaceModeSwitch,
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof WorkspaceModeSwitch>;

export const Default: Story = {
  render: () => <WorkspaceModeSwitch />,
};

export const SimpleMode: Story = {
  render: () => <WorkspaceModeSwitch defaultMode="simple" />,
};

export const AdvancedMode: Story = {
  render: () => <WorkspaceModeSwitch defaultMode="advanced" />,
};

export const CustomLabels: Story = {
  render: () => (
    <WorkspaceModeSwitch simpleLabel="Basic view" advancedLabel="Expert view" />
  ),
};
