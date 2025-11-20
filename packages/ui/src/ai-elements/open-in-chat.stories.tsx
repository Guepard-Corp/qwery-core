import type { Meta, StoryObj } from '@storybook/react';
import {
  OpenIn,
  OpenInTrigger,
  OpenInContent,
  OpenInLabel,
  OpenInSeparator,
  OpenInChatGPT,
  OpenInClaude,
  OpenInT3,
  OpenInCursor,
} from './open-in-chat';
import { Button } from '../shadcn/button';

const meta: Meta<typeof OpenIn> = {
  title: 'AI Elements/OpenInChat',
  component: OpenIn,
};

export default meta;
type Story = StoryObj<typeof OpenIn>;

export const Simple: Story = {
  render: () => (
    <div className="max-w-md">
      <OpenIn query="How do I implement authentication in React?">
        <OpenInTrigger asChild>
          <Button variant="outline">Open in chat</Button>
        </OpenInTrigger>
        <OpenInContent>
          <OpenInLabel>Open in</OpenInLabel>
          <OpenInSeparator />
          <OpenInChatGPT />
          <OpenInClaude />
          <OpenInT3 />
          <OpenInCursor />
        </OpenInContent>
      </OpenIn>
    </div>
  ),
};

export const WithCustomTrigger: Story = {
  render: () => (
    <div className="max-w-md">
      <OpenIn query="Explain React hooks">
        <OpenInTrigger asChild>
          <Button>Share Query</Button>
        </OpenInTrigger>
        <OpenInContent>
          <OpenInLabel>Share with</OpenInLabel>
          <OpenInSeparator />
          <OpenInChatGPT />
          <OpenInClaude />
          <OpenInT3 />
        </OpenInContent>
      </OpenIn>
    </div>
  ),
};

export const LongQuery: Story = {
  render: () => (
    <div className="max-w-md">
      <OpenIn query="I need help building a full-stack application with React, Node.js, and PostgreSQL. Can you provide a step-by-step guide including authentication, database setup, and deployment?">
        <OpenInTrigger asChild>
          <Button variant="outline">Open in chat</Button>
        </OpenInTrigger>
        <OpenInContent>
          <OpenInLabel>Open in</OpenInLabel>
          <OpenInSeparator />
          <OpenInChatGPT />
          <OpenInClaude />
          <OpenInT3 />
          <OpenInCursor />
        </OpenInContent>
      </OpenIn>
    </div>
  ),
};

