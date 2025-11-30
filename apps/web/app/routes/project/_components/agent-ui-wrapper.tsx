'use client';

import { useMemo, useImperativeHandle, forwardRef, useRef } from 'react';
import QweryAgentUI from '@qwery/ui/agent-ui';
import { defaultTransport } from '@qwery/agent-factory-sdk';
import { MessageOutput } from '@qwery/domain/usecases';
import { convertMessages } from '~/lib/utils/messages-converter';

export interface AgentUIWrapperRef {
  sendMessage: (text: string) => void;
}

export interface AgentUIWrapperProps {
  agentName?: string;
  conversationSlug: string;
  initialMessages?: MessageOutput[];
}

export const AgentUIWrapper = forwardRef<
  AgentUIWrapperRef,
  AgentUIWrapperProps
>(function AgentUIWrapper({ conversationSlug, initialMessages }, ref) {
  const sendMessageRef = useRef<((text: string) => void) | null>(null);

  const transport = useMemo(
    () => defaultTransport(`/api/chat/${conversationSlug}`),
    [conversationSlug],
  );

  useImperativeHandle(
    ref,
    () => ({
      sendMessage: (text: string) => {
        sendMessageRef.current?.(text);
      },
    }),
    [],
  );

  return (
    <QweryAgentUI
      transport={transport}
      initialMessages={convertMessages(initialMessages)}
    />
  );
});
