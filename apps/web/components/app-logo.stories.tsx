import type { Meta, StoryObj } from '@storybook/react';

import { LogoImage } from './app-logo';

const Component = () => {
  return (
    <div className="flex w-full items-center justify-between">
      <div className="flex items-center space-x-4">
        <LogoImage />
      </div>
    </div>
  );
};

const meta: Meta<typeof LogoImage> = {
  title: 'Qwery/AppLogo',
  component: Component,
};

export default meta;

type Story = StoryObj<typeof Component>;

export const Default: Story = {
  args: {},
};
