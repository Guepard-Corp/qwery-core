import type { Meta, StoryObj } from '@storybook/react';
import { Checkpoint, CheckpointIcon, CheckpointTrigger } from './checkpoint';
import { BookmarkIcon } from 'lucide-react';

const meta: Meta<typeof Checkpoint> = {
  title: 'AI Elements/Checkpoint',
  component: Checkpoint,
};

export default meta;
type Story = StoryObj<typeof Checkpoint>;

export const Simple: Story = {
  render: () => (
    <div className="max-w-md space-y-2">
      <Checkpoint>
        <CheckpointIcon>
          <BookmarkIcon />
        </CheckpointIcon>
        <CheckpointTrigger tooltip="Checkpoint 1">Step 1</CheckpointTrigger>
      </Checkpoint>
      <Checkpoint>
        <CheckpointIcon />
        <CheckpointTrigger tooltip="Checkpoint 2">Step 2</CheckpointTrigger>
      </Checkpoint>
      <Checkpoint>
        <CheckpointIcon />
        <CheckpointTrigger tooltip="Checkpoint 3">Step 3</CheckpointTrigger>
      </Checkpoint>
    </div>
  ),
};

export const WithCustomIcon: Story = {
  render: () => (
    <div className="max-w-md space-y-2">
      <Checkpoint>
        <CheckpointIcon>
          <span className="text-lg">📍</span>
        </CheckpointIcon>
        <CheckpointTrigger>Custom Icon Checkpoint</CheckpointTrigger>
      </Checkpoint>
    </div>
  ),
};

export const MultipleCheckpoints: Story = {
  render: () => (
    <div className="max-w-md space-y-1">
      <Checkpoint>
        <CheckpointIcon />
        <CheckpointTrigger tooltip="Initial checkpoint">
          Start
        </CheckpointTrigger>
      </Checkpoint>
      <Checkpoint>
        <CheckpointIcon />
        <CheckpointTrigger tooltip="Processing checkpoint">
          Processing
        </CheckpointTrigger>
      </Checkpoint>
      <Checkpoint>
        <CheckpointIcon />
        <CheckpointTrigger tooltip="Final checkpoint">
          Complete
        </CheckpointTrigger>
      </Checkpoint>
    </div>
  ),
};
