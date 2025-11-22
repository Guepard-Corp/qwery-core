import type { Meta, StoryObj } from '@storybook/react';
import { UIMessage } from 'ai';
import { MessageRenderer } from './message-renderer';
import { TaskUIPart } from './message-parts';
import { ToolUIPart as AIToolUIPart } from 'ai';

const meta: Meta<typeof MessageRenderer> = {
  title: 'Qwery/AI/Message Renderer',
  component: MessageRenderer,
};

export default meta;
type Story = StoryObj<typeof MessageRenderer>;

const mockUserMessage: UIMessage = {
  id: 'msg-user-1',
  role: 'user',
  parts: [{ type: 'text', text: 'Hello, can you help me with a task?' }],
};

const mockAssistantMessage: UIMessage = {
  id: 'msg-assistant-1',
  role: 'assistant',
  parts: [
    {
      type: 'text',
      text: 'Of course! I can help you with that. Let me break this down into steps.',
    },
  ],
};

const mockMessageWithTasks: UIMessage = {
  id: 'msg-tasks-1',
  role: 'assistant',
  parts: [
    {
      type: 'data-tasks',
      id: 'task-group-1',
      data: {
        title: 'Processing Your Request',
        subtitle: 'Breaking down into manageable steps',
        tasks: [
          {
            id: 't1',
            label: 'Analyze requirements',
            status: 'completed',
          },
          {
            id: 't2',
            label: 'Generate solution',
            status: 'in-progress',
          },
          {
            id: 't3',
            label: 'Validate output',
            status: 'pending',
          },
        ],
      },
    } as TaskUIPart,
  ],
};

const mockMessageWithReasoning: UIMessage = {
  id: 'msg-reasoning-1',
  role: 'assistant',
  parts: [
    {
      type: 'reasoning',
      text: 'Let me think through this problem step by step. First, I need to understand what the user is asking for...',
    },
    {
      type: 'text',
      text: 'Based on my analysis, here is the solution...',
    },
  ],
};

const mockMessageWithTool: UIMessage = {
  id: 'msg-tool-1',
  role: 'assistant',
  parts: [
    {
      type: 'text',
      text: 'I need to search the database for this information.',
    },
    {
      type: 'tool-search_database',
      toolCallId: 'call-123',
      state: 'output-available',
      input: { query: 'SELECT * FROM users' },
      output: { count: 42 },
    } as AIToolUIPart,
    {
      type: 'text',
      text: 'Found 42 users in the database.',
    },
  ],
};

const mockMessageWithSources: UIMessage = {
  id: 'msg-sources-1',
  role: 'assistant',
  parts: [
    {
      type: 'source-url',
      sourceId: 'source-1',
      url: 'https://example.com/doc1',
    },
    {
      type: 'source-url',
      sourceId: 'source-2',
      url: 'https://example.com/doc2',
    },
    {
      type: 'text',
      text: 'Based on the sources above, here is the answer...',
    },
  ],
};

const mockMessageComplex: UIMessage = {
  id: 'msg-complex-1',
  role: 'assistant',
  parts: [
    {
      type: 'source-url',
      sourceId: 'source-1',
      url: 'https://example.com/doc1',
    },
    {
      type: 'reasoning',
      text: 'Let me analyze the sources and think about the best approach...',
    },
    {
      type: 'tool-calculate',
      toolCallId: 'call-456',
      state: 'output-available',
      input: { operation: 'sum', values: [1, 2, 3] },
      output: { result: 6 },
    } as AIToolUIPart,
    {
      type: 'text',
      text: 'The calculation shows that the sum is 6.',
    },
  ],
};

export const UserMessage: Story = {
  render: () => (
    <div className="bg-background min-h-screen p-8">
      <MessageRenderer
        message={mockUserMessage}
        messages={[mockUserMessage]}
        status={undefined}
      />
    </div>
  ),
};

export const AssistantMessage: Story = {
  render: () => (
    <div className="bg-background min-h-screen p-8">
      <MessageRenderer
        message={mockAssistantMessage}
        messages={[mockAssistantMessage]}
        status={undefined}
        onRegenerate={() => console.log('Regenerate')}
      />
    </div>
  ),
};

export const MessageWithTasks: Story = {
  render: () => (
    <div className="bg-background min-h-screen p-8">
      <MessageRenderer
        message={mockMessageWithTasks}
        messages={[mockMessageWithTasks]}
        status={undefined}
      />
    </div>
  ),
};

export const MessageWithReasoning: Story = {
  render: () => (
    <div className="bg-background min-h-screen p-8">
      <MessageRenderer
        message={mockMessageWithReasoning}
        messages={[mockMessageWithReasoning]}
        status={undefined}
      />
    </div>
  ),
};

export const MessageWithTool: Story = {
  render: () => (
    <div className="bg-background min-h-screen p-8">
      <MessageRenderer
        message={mockMessageWithTool}
        messages={[mockMessageWithTool]}
        status={undefined}
      />
    </div>
  ),
};

export const MessageWithSources: Story = {
  render: () => (
    <div className="bg-background min-h-screen p-8">
      <MessageRenderer
        message={mockMessageWithSources}
        messages={[mockMessageWithSources]}
        status={undefined}
      />
    </div>
  ),
};

export const ComplexMessage: Story = {
  render: () => (
    <div className="bg-background min-h-screen p-8">
      <MessageRenderer
        message={mockMessageComplex}
        messages={[mockMessageComplex]}
        status={undefined}
      />
    </div>
  ),
};
