import type { Meta, StoryObj } from '@storybook/react';
import { UIMessage } from 'ai';
import { QweryConversationContent } from './conversation-content';
import { TaskUIPart } from './message-parts';
import { ToolUIPart as AIToolUIPart } from 'ai';

const meta: Meta<typeof QweryConversationContent> = {
  title: 'Qwery/AI/Conversation Content',
  component: QweryConversationContent,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof QweryConversationContent>;

const mockMessages: UIMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    parts: [{ type: 'text', text: 'Can you help me analyze some data?' }],
  },
  {
    id: 'msg-2',
    role: 'assistant',
    parts: [
      {
        type: 'data-tasks',
        id: 'task-1',
        data: {
          title: 'Data Analysis',
          tasks: [
            { id: 't1', label: 'Load data', status: 'completed' },
            { id: 't2', label: 'Process data', status: 'in-progress' },
            { id: 't3', label: 'Generate report', status: 'pending' },
          ],
        },
      } as TaskUIPart,
    ],
  },
  {
    id: 'msg-3',
    role: 'assistant',
    parts: [
      {
        type: 'reasoning',
        text: 'Let me think about the best approach to analyze this data...',
      },
      {
        type: 'text',
        text: 'I will process the data using statistical methods.',
      },
    ],
  },
  {
    id: 'msg-4',
    role: 'assistant',
    parts: [
      {
        type: 'tool-analyze_data',
        toolCallId: 'call-1',
        state: 'output-available',
        input: { dataset: 'sample.csv' },
        output: { mean: 42.5, std: 12.3 },
      } as AIToolUIPart,
    ],
  },
  {
    id: 'msg-5',
    role: 'user',
    parts: [{ type: 'text', text: 'What are the results?' }],
  },
  {
    id: 'msg-6',
    role: 'assistant',
    parts: [
      {
        type: 'source-url',
        sourceId: 'source-1',
        url: 'https://example.com/data-source',
      },
      {
        type: 'text',
        text: 'The analysis shows a mean of 42.5 with a standard deviation of 12.3.',
      },
    ],
  },
];

export const Default: Story = {
  render: () => (
    <div className="h-screen">
      <QweryConversationContent
        messages={mockMessages}
        status={undefined}
        onRegenerate={() => console.log('Regenerate')}
      />
    </div>
  ),
};

export const WithLoading: Story = {
  render: () => (
    <div className="h-screen">
      <QweryConversationContent
        messages={mockMessages}
        status="submitted"
        onRegenerate={() => console.log('Regenerate')}
      />
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div className="h-screen">
      <QweryConversationContent messages={[]} status={undefined} />
    </div>
  ),
};

export const SingleMessage: Story = {
  render: () => (
    <div className="h-screen">
      <QweryConversationContent
        messages={[mockMessages[0]!]}
        status={undefined}
      />
    </div>
  ),
};
