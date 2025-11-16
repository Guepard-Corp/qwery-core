'use client';

import { useMemo } from 'react';
import QweryAgentUI from '@qwery/ui/agent-ui';
import { LangGraphTransport } from '@qwery/ai-agents/langgraph-transport';

export function AgentUIWrapper() {
  const transport = useMemo(
    () =>
      new LangGraphTransport({
        model: 'Llama-3.1-8B-Instruct-q4f32_1',
        maxIterations: 10,
        // Tools can be added here later
        // tools: [/* custom tools */],
      }),
    [],
  );

  return <QweryAgentUI transport={transport} />;
}
