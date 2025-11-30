import { useRef } from 'react';
import { AgentUIWrapper, type AgentUIWrapperRef } from './agent-ui-wrapper';
import { MessageOutput } from '@qwery/domain/usecases';

export interface AgentProps {
  conversationSlug: string;
  initialMessages?: MessageOutput[];
}
export default function Agent({
  conversationSlug,
  initialMessages,
}: AgentProps) {
  const agentRef = useRef<AgentUIWrapperRef>(null);

  return (
    <div className="h-[calc(100vh-50px)] overflow-auto p-0">
      <AgentUIWrapper
        ref={agentRef}
        agentName={'test-agent'}
        conversationSlug={conversationSlug}
        initialMessages={initialMessages}
      />
    </div>
  );
}
