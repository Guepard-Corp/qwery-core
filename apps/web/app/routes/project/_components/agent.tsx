import { forwardRef } from 'react';
import { AgentUIWrapper, type AgentUIWrapperRef } from './agent-ui-wrapper';
import { MessageOutput } from '@qwery/domain/usecases';

export interface AgentProps {
  conversationSlug: string;
  initialMessages?: MessageOutput[];
  initialSuggestions?: string[];
}

const Agent = forwardRef<AgentUIWrapperRef, AgentProps>(
  ({ conversationSlug, initialMessages, initialSuggestions }, ref) => {
    return (
      <div className="mx-[calc(-1*var(--chat-pad-x,0px))] h-full min-h-0 w-[calc(100%+2*var(--chat-pad-x,0px))] max-w-none min-w-0 overflow-hidden">
        <AgentUIWrapper
          ref={ref}
          conversationSlug={conversationSlug}
          initialMessages={initialMessages}
          initialSuggestions={initialSuggestions}
        />
      </div>
    );
  },
);

Agent.displayName = 'Agent';

export default Agent;
