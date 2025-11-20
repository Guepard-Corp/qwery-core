import type { Meta, StoryObj } from '@storybook/react';
import { Shimmer } from './shimmer';

const meta: Meta<typeof Shimmer> = {
  title: 'AI Elements/Shimmer',
  component: Shimmer,
};

export default meta;
type Story = StoryObj<typeof Shimmer>;

export const Simple: Story = {
  render: () => (
    <div className="max-w-md">
      <Shimmer>Loading...</Shimmer>
    </div>
  ),
};

export const ShortText: Story = {
  render: () => (
    <div className="max-w-md space-y-2">
      <Shimmer>Thinking</Shimmer>
      <p className="text-sm text-muted-foreground">
        Short shimmer text example
      </p>
    </div>
  ),
};

export const LongText: Story = {
  render: () => (
    <div className="max-w-md space-y-2">
      <Shimmer>Generating response, please wait...</Shimmer>
      <p className="text-sm text-muted-foreground">
        Longer shimmer text example
      </p>
    </div>
  ),
};

export const InHeading: Story = {
  render: () => (
    <div className="max-w-md space-y-2">
      <h2 className="text-2xl font-bold">
        <Shimmer as="span">Processing your request</Shimmer>
      </h2>
      <p className="text-sm text-muted-foreground">
        Shimmer can be used in headings
      </p>
    </div>
  ),
};

export const CustomDuration: Story = {
  render: () => (
    <div className="max-w-md space-y-4">
      <div>
        <Shimmer duration={1}>Fast animation (1s)</Shimmer>
      </div>
      <div>
        <Shimmer duration={3}>Slow animation (3s)</Shimmer>
      </div>
      <p className="text-sm text-muted-foreground">
        Custom duration examples
      </p>
    </div>
  ),
};

export const CustomSpread: Story = {
  render: () => (
    <div className="max-w-md space-y-4">
      <div>
        <Shimmer spread={1}>Narrow spread</Shimmer>
      </div>
      <div>
        <Shimmer spread={4}>Wide spread</Shimmer>
      </div>
      <p className="text-sm text-muted-foreground">Custom spread examples</p>
    </div>
  ),
};

