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
      <div className="h-[calc(100vh-50px)] overflow-auto p-0">
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
