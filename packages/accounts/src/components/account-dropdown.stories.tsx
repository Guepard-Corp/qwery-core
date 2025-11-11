import type { Meta, StoryObj } from '@storybook/react';

import { AccountDropdown } from './account-dropdown';

const meta: Meta<typeof AccountDropdown> = {
  title: 'Accounts/AccountDropdown',
  component: AccountDropdown,
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof AccountDropdown>;

export const Default: Story = {
  args: {
    // Provide any required props if needed for AccountDropdown
  },
};
