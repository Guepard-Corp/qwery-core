import type { Meta, StoryObj } from '@storybook/react';
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from './message';
import { CopyIcon, RefreshCcwIcon } from 'lucide-react';

const meta: Meta<typeof Message> = {
  title: 'AI Elements/Message',
  component: Message,
};

export default meta;
type Story = StoryObj<typeof Message>;

export const UserMessage: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Message from="user">
        <MessageContent>
          <MessageResponse>Hello, how are you?</MessageResponse>
        </MessageContent>
      </Message>
    </div>
  ),
};

export const AssistantMessage: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Message from="assistant">
        <MessageContent>
          <MessageResponse>
            I'm doing well, thank you! How can I help you today?
          </MessageResponse>
        </MessageContent>
      </Message>
    </div>
  ),
};

export const WithActions: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Message from="assistant">
        <MessageContent>
          <MessageResponse>
            This is a message with action buttons. You can copy or regenerate
            this message.
          </MessageResponse>
        </MessageContent>
        <MessageActions>
          <MessageAction tooltip="Regenerate" label="Regenerate">
            <RefreshCcwIcon className="size-3" />
          </MessageAction>
          <MessageAction tooltip="Copy" label="Copy">
            <CopyIcon className="size-3" />
          </MessageAction>
        </MessageActions>
      </Message>
    </div>
  ),
};

export const LongMessage: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Message from="assistant">
        <MessageContent>
          <MessageResponse>
            This is a longer message that demonstrates how the message component
            handles extended content. It should wrap properly and maintain good
            readability. The component is designed to handle both short and long
            messages gracefully, ensuring that the content is always presented
            in a clear and accessible manner.
          </MessageResponse>
        </MessageContent>
        <MessageActions>
          <MessageAction tooltip="Copy" label="Copy">
            <CopyIcon className="size-3" />
          </MessageAction>
        </MessageActions>
      </Message>
    </div>
  ),
};

export const Conversation: Story = {
  render: () => (
    <div className="max-w-2xl space-y-4">
      <Message from="user">
        <MessageContent>
          <MessageResponse>What is React?</MessageResponse>
        </MessageContent>
      </Message>
      <Message from="assistant">
        <MessageContent>
          <MessageResponse>
            React is a JavaScript library for building user interfaces. It lets
            you compose complex UIs from small and isolated pieces of code
            called "components".
          </MessageResponse>
        </MessageContent>
        <MessageActions>
          <MessageAction tooltip="Copy" label="Copy">
            <CopyIcon className="size-3" />
          </MessageAction>
        </MessageActions>
      </Message>
      <Message from="user">
        <MessageContent>
          <MessageResponse>Can you give me an example?</MessageResponse>
        </MessageContent>
      </Message>
      <Message from="assistant">
        <MessageContent>
          <MessageResponse>
            Sure! Here's a simple React component example:
            <pre className="bg-muted mt-2 rounded p-2 text-sm">
              {`function Button({ onClick, children }) {
  return <button onClick={onClick}>{children}</button>;
}`}
            </pre>
          </MessageResponse>
        </MessageContent>
        <MessageActions>
          <MessageAction tooltip="Copy" label="Copy">
            <CopyIcon className="size-3" />
          </MessageAction>
        </MessageActions>
      </Message>
    </div>
  ),
};
