import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router';
import { AccountDropdown } from './account-dropdown';

const meta: Meta<typeof AccountDropdown> = {
  title: 'Accounts/AccountDropdown',
  component: AccountDropdown,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/']}>
        <Story />
      </MemoryRouter>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof AccountDropdown>;

export const Default: Story = {
  args: {
    paths: {
      home: '/',
    },
  },
};
