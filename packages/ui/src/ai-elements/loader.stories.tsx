import type { Meta, StoryObj } from '@storybook/react';
import { Loader } from './loader';

const meta: Meta<typeof Loader> = {
  title: 'AI Elements/Loader',
  component: Loader,
};

export default meta;
type Story = StoryObj<typeof Loader>;

export const Simple: Story = {
  render: () => (
    <div className="flex h-32 items-center justify-center">
      <Loader />
    </div>
  ),
};

export const Small: Story = {
  render: () => (
    <div className="flex h-32 items-center justify-center gap-4">
      <Loader size={12} />
      <span className="text-muted-foreground text-sm">Small (12px)</span>
    </div>
  ),
};

export const Medium: Story = {
  render: () => (
    <div className="flex h-32 items-center justify-center gap-4">
      <Loader size={16} />
      <span className="text-muted-foreground text-sm">Medium (16px)</span>
    </div>
  ),
};

export const Large: Story = {
  render: () => (
    <div className="flex h-32 items-center justify-center gap-4">
      <Loader size={24} />
      <span className="text-muted-foreground text-sm">Large (24px)</span>
    </div>
  ),
};

export const ExtraLarge: Story = {
  render: () => (
    <div className="flex h-32 items-center justify-center gap-4">
      <Loader size={32} />
      <span className="text-muted-foreground text-sm">Extra Large (32px)</span>
    </div>
  ),
};

export const Inline: Story = {
  render: () => (
    <div className="space-y-2">
      <p>
        Loading... <Loader size={14} />
      </p>
      <p className="text-muted-foreground text-sm">
        The loader can be used inline with text
      </p>
    </div>
  ),
};
