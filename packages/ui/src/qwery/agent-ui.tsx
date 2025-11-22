'use client';

import { useState, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { ChatTransport, UIMessage } from 'ai';
import type { PromptInputMessage } from '../ai-elements/prompt-input';
import QweryPromptInput from './ai/prompt-input';
import { QweryConversationContent } from './ai/conversation-content';

const models = [
  {
    name: 'azure/gpt-5-mini',
    value: 'azure/gpt-5-mini',
  },
];

export interface QweryAgentUIProps {
  transport: ChatTransport<UIMessage>;
  onSendMessageReady?: (sendMessage: (text: string) => void) => void;
}

export default function QweryAgentUI(props: QweryAgentUIProps) {
  const { transport, onSendMessageReady } = props;
  const [input, setInput] = useState('');
  const [model, setModel] = useState(models[0]?.value ?? '');
  const { messages, sendMessage, status, regenerate } = useChat({
    transport,
  });

  // Expose sendMessage to parent via callback
  useEffect(() => {
    if (onSendMessageReady) {
      onSendMessageReady((text: string) => {
        sendMessage({
          text,
        });
      });
    }
  }, [onSendMessageReady, sendMessage]);

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    sendMessage(
      {
        text: message.text || 'Sent with attachments',
        files: message.files,
      },
      {
        body: {
          model: model,
        },
      },
    );
    setInput('');
  };

  return (
    <div className="relative flex size-full flex-col divide-y overflow-hidden">
      <QweryConversationContent
        messages={messages}
        status={status}
        onRegenerate={regenerate}
      />
      <QweryPromptInput
        onSubmit={handleSubmit}
        input={input}
        setInput={setInput}
        model={model}
        setModel={setModel}
        models={models}
        status={status}
      />
    </div>
  );
}
