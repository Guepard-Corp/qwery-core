import * as React from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { Page } from './page';

const meta: Meta<typeof Page> = {
  title: 'Qwery/Page',
  component: Page,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof Page>;

export const Simple: Story = {
  render: () => (
    <Page>
      <div className="flex h-full">
        <h1 className="text-2xl font-bold" data-test="page-title">
          Hello from Qwery Page!
        </h1>
      </div>
    </Page>
  ),
};
