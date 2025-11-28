'use client';

import { useMemo, useImperativeHandle, forwardRef, useRef } from 'react';
import QweryAgentUI from '@qwery/ui/agent-ui';
import { defaultTransport } from '@qwery/agent-factory-sdk';

export interface AgentUIWrapperRef {
  sendMessage: (text: string) => void;
}

export interface AgentUIWrapperProps {
  agentName?: string;
  conversationSlug: string;
}

export const AgentUIWrapper = forwardRef<
  AgentUIWrapperRef,
  AgentUIWrapperProps
>(function AgentUIWrapper({ conversationSlug }, ref) {
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

  return <QweryAgentUI transport={transport} />;
});
