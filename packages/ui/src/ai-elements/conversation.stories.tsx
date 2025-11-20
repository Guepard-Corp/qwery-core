import type { Meta, StoryObj } from '@storybook/react';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from './conversation';
import { Message, MessageContent, MessageResponse } from './message';
import { useState } from 'react';

const meta: Meta<typeof Conversation> = {
  title: 'AI Elements/Conversation',
  component: Conversation,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof Conversation>;

export const Empty: Story = {
  render: () => (
    <div className="h-screen w-full">
      <Conversation>
        <ConversationContent>
          <ConversationEmptyState
            title="No messages yet"
            description="Start a conversation to see messages here"
          />
        </ConversationContent>
      </Conversation>
    </div>
  ),
};

export const WithMessages: Story = {
  render: () => {
    const messages = [
      { id: '1', role: 'user' as const, text: 'Hello, how are you?' },
      {
        id: '2',
        role: 'assistant' as const,
        text: "I'm doing well, thank you! How can I help you today?",
      },
      {
        id: '3',
        role: 'user' as const,
        text: 'Can you explain React hooks?',
      },
      {
        id: '4',
        role: 'assistant' as const,
        text: 'React hooks are functions that let you use state and other React features in functional components. Some common hooks include useState, useEffect, and useContext.',
      },
    ];

    return (
      <div className="h-screen w-full max-w-4xl mx-auto p-4">
        <Conversation>
          <ConversationContent>
            {messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  <MessageResponse>{message.text}</MessageResponse>
                </MessageContent>
              </Message>
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>
    );
  },
};

export const LongConversation: Story = {
  render: () => {
    const messages = Array.from({ length: 20 }, (_, i) => ({
      id: `${i + 1}`,
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      text: `This is message ${i + 1}. ${i % 2 === 0 ? 'User message here.' : 'Assistant response here with some longer text to demonstrate scrolling behavior.'}`,
    }));

    return (
      <div className="h-screen w-full max-w-4xl mx-auto p-4">
        <Conversation>
          <ConversationContent>
            {messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  <MessageResponse>{message.text}</MessageResponse>
                </MessageContent>
              </Message>
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>
    );
  },
};

export const CustomEmptyState: Story = {
  render: () => (
    <div className="h-screen w-full">
      <Conversation>
        <ConversationContent>
          <ConversationEmptyState
            title="Welcome!"
            description="Get started by asking a question"
            icon={<span className="text-4xl">💬</span>}
          />
        </ConversationContent>
      </Conversation>
    </div>
  ),
};

