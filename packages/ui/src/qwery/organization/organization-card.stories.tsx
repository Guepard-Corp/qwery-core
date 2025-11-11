import type { Meta, StoryObj } from '@storybook/react';

import { OrganizationCard } from './organization-card';

const meta: Meta<typeof OrganizationCard> = {
  title: 'Qwery/Organization/OrganizationCard',
  component: OrganizationCard,
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof OrganizationCard>;

export const Basic: Story = {
  args: {
    id: 'org_123',
    name: 'Acme Inc.',
    onClick: () => alert('Clicked!'),
  },
};
