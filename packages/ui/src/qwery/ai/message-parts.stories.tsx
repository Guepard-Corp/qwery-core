import type { Meta, StoryObj } from '@storybook/react';
import {
  TaskPart,
  TextPart,
  ReasoningPart,
  ToolPart,
  SourcesPart,
  TaskUIPart,
} from './message-parts';
import { ToolUIPart as AIToolUIPart } from 'ai';

const meta: Meta = {
  title: 'Qwery/AI/Message Parts',
};

export default meta;
type Story = StoryObj;

const mockTaskPart: TaskUIPart = {
  type: 'data-tasks',
  id: 'task-1',
  data: {
    title: 'Processing Request',
    subtitle: 'Breaking down your request into tasks',
    tasks: [
      {
        id: 't1',
        label: 'Analyze input data',
        description: 'Processing the provided information',
        status: 'completed',
      },
      {
        id: 't2',
        label: 'Generate response',
        description: 'Creating the final output',
        status: 'in-progress',
      },
      {
        id: 't3',
        label: 'Validate results',
        status: 'pending',
      },
      {
        id: 't4',
        label: 'Failed task',
        description: 'This task encountered an error',
        status: 'error',
      },
    ],
  },
};

export const TaskPartStory: Story = {
  render: () => (
    <div className="bg-background min-h-screen p-8">
      <TaskPart part={mockTaskPart} messageId="msg-1" index={0} />
    </div>
  ),
};

export const TextPartUser: Story = {
  render: () => (
    <div className="bg-background min-h-screen p-8">
      <TextPart
        part={{ type: 'text', text: 'Hello, how can you help me today?' }}
        messageId="msg-1"
        messageRole="user"
        index={0}
        isLastMessage={false}
      />
    </div>
  ),
};

export const TextPartAssistant: Story = {
  render: () => (
    <div className="bg-background min-h-screen p-8">
      <TextPart
        part={{
          type: 'text',
          text: 'I can help you with various tasks. What would you like to know?',
        }}
        messageId="msg-1"
        messageRole="assistant"
        index={0}
        isLastMessage={true}
        onRegenerate={() => console.log('Regenerate clicked')}
      />
    </div>
  ),
};

export const ReasoningPartStory: Story = {
  render: () => (
    <div className="bg-background min-h-screen p-8">
      <ReasoningPart
        part={{
          type: 'reasoning',
          text: 'Let me think about this step by step. First, I need to understand the context...',
        }}
        messageId="msg-1"
        index={0}
        isStreaming={false}
      />
    </div>
  ),
};

export const ReasoningPartStreaming: Story = {
  render: () => (
    <div className="bg-background min-h-screen p-8">
      <ReasoningPart
        part={{
          type: 'reasoning',
          text: 'Let me think about this step by step. First, I need to understand the context...',
        }}
        messageId="msg-1"
        index={0}
        isStreaming={true}
      />
    </div>
  ),
};

const mockToolPart: AIToolUIPart = {
  type: 'tool-search_database',
  toolCallId: 'call-123',
  state: 'output-available',
  input: {
    query: 'SELECT * FROM users WHERE age > 25',
  },
  output: {
    results: [
      { id: 1, name: 'John', age: 30 },
      { id: 2, name: 'Jane', age: 28 },
    ],
  },
};

export const ToolPartSuccess: Story = {
  render: () => (
    <div className="bg-background min-h-screen p-8">
      <ToolPart part={mockToolPart} messageId="msg-1" index={0} />
    </div>
  ),
};

const mockToolPartError: AIToolUIPart = {
  type: 'tool-api_call',
  toolCallId: 'call-456',
  state: 'output-error',
  input: {
    endpoint: '/api/users',
  },
  output: undefined,
  errorText: 'Failed to connect to API: Connection timeout',
};

export const ToolPartError: Story = {
  render: () => (
    <div className="bg-background min-h-screen p-8">
      <ToolPart part={mockToolPartError} messageId="msg-1" index={0} />
    </div>
  ),
};

export const SourcesPartStory: Story = {
  render: () => (
    <div className="bg-background min-h-screen p-8">
      <SourcesPart
        parts={[
          {
            type: 'source-url',
            sourceId: 'source-1',
            url: 'https://example.com/article1',
          },
          {
            type: 'source-url',
            sourceId: 'source-2',
            url: 'https://example.com/article2',
          },
          {
            type: 'source-url',
            sourceId: 'source-3',
            url: 'https://example.com/article3',
          },
        ]}
        messageId="msg-1"
      />
    </div>
  ),
};
