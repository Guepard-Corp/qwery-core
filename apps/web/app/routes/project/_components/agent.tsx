import { useRef } from 'react';
import { AgentUIWrapper, type AgentUIWrapperRef } from './agent-ui-wrapper';

export interface AgentProps {
  conversationSlug: string;
}
export default function Agent({ conversationSlug }: AgentProps) {
  const agentRef = useRef<AgentUIWrapperRef>(null);

  return (
    <div className="h-[calc(100vh-50px)] overflow-auto p-0">
      <AgentUIWrapper
        ref={agentRef}
        agentName={'test-agent'}
        conversationSlug={conversationSlug}
      />
    </div>
  );
}
