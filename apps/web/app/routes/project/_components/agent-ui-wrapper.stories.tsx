import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AgentUIWrapper } from './agent-ui-wrapper';

const meta: Meta<typeof AgentUIWrapper> = {
  title: 'Project/AgentUIWrapper',
  component: AgentUIWrapper,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => {
      const [queryClient] = useState(
        () =>
          new QueryClient({
            defaultOptions: {
              queries: {
                staleTime: 60 * 1000,
              },
            },
          }),
      );

      return (
        <QueryClientProvider client={queryClient}>
          <ThemeProvider attribute="class" enableSystem defaultTheme="system">
            <div className="h-screen w-full">
              <Story />
            </div>
          </ThemeProvider>
        </QueryClientProvider>
      );
    },
  ],
};

export default meta;

type Story = StoryObj<typeof AgentUIWrapper>;

export const Default: Story = {
  render: () => <AgentUIWrapper conversationSlug="test-conversation" />,
};
