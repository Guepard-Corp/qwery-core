import * as React from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { Spinner } from './spinner';

const meta: Meta<typeof Spinner> = {
  title: 'Qwery/Spinner',
  component: Spinner,
};

export default meta;
type Story = StoryObj<typeof Spinner>;

export const Simple: Story = {
  render: () => (
    <div className="flex h-32 items-center justify-center">
      <Spinner data-test="spinner" />
    </div>
  ),
};
