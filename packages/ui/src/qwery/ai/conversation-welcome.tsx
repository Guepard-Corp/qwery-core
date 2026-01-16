'use client';

import { useState } from 'react';
import { Button } from '../../shadcn/button';
import {
  PromptInput,
  PromptInputBody,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
} from '../../ai-elements/prompt-input';
import { ChatStatus } from 'ai';
import { isChatStreaming, getChatStatusConfig } from './utils/chat-status';
import { MessageSquareIcon, Sparkles } from 'lucide-react';

export interface ConversationWelcomeProps {
  onSubmit: (message: PromptInputMessage) => void;
  status?: ChatStatus;
}

export function ConversationWelcome({
  onSubmit,
  status,
}: ConversationWelcomeProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (message: PromptInputMessage) => {
    if (message.text?.trim()) {
      onSubmit(message);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && input.trim()) {
      e.preventDefault();
      handleSubmit({ text: input.trim(), files: [] });
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] w-full items-center justify-center px-4">
      <div className="w-full max-w-3xl space-y-8">
        {/* Welcome Header */}
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="bg-primary/10 flex size-16 items-center justify-center rounded-full">
              <Sparkles className="text-primary size-8" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">
              Start a new conversation
            </h1>
            <p className="text-muted-foreground text-lg">
              Ask anything or describe what you&apos;d like to explore
            </p>
          </div>
        </div>

        {/* Input Section */}
        <div className="mx-auto w-full max-w-2xl">
          <PromptInput
            onSubmit={handleSubmit}
            className="w-full"
            globalDrop
            multiple
          >
            <PromptInputBody>
              <PromptInputTextarea
                onChange={(e) => setInput(e.target.value)}
                value={input}
                onKeyDown={handleKeyDown}
                placeholder="Type your message here..."
                className="min-h-[120px] resize-none"
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools />
              <PromptInputSubmit
                disabled={!input.trim() || isChatStreaming(status)}
                status={status}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>

        {/* Quick Start Button */}
        {!input.trim() && (
          <div className="flex justify-center">
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                handleSubmit({ text: 'New Conversation', files: [] });
              }}
              className="gap-2"
            >
              <MessageSquareIcon className="size-4" />
              Start with a blank conversation
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
