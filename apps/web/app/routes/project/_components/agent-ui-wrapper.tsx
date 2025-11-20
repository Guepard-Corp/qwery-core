'use client';

import { useMemo } from 'react';
import QweryAgentUI from '@qwery/ui/agent-ui';
import { LangGraphTransport } from '@qwery/ai-agents/langgraph-transport';
import type { LlmProviderConfig } from '@qwery/ai-agents/langgraph-agent';

const DEFAULT_MODEL = 'Llama-3.1-8B-Instruct-q4f32_1-MLC';

function resolveLlmConfig(): LlmProviderConfig {
  const provider = import.meta.env?.VITE_AGENT_PROVIDER?.toLowerCase();
  const temperature =
    Number(import.meta.env?.VITE_AGENT_TEMPERATURE ?? '0.1') || 0.1;

  if (provider === 'azure') {
    const apiKey = import.meta.env?.VITE_AZURE_API_KEY;
    const endpoint = import.meta.env?.VITE_AZURE_ENDPOINT;
    const deployment = import.meta.env?.VITE_AZURE_DEPLOYMENT_ID;
    const apiVersion =
      import.meta.env?.VITE_AZURE_API_VERSION || '2024-04-01-preview';

    if (apiKey && endpoint && deployment) {
      return {
        provider: 'azure',
        apiKey,
        endpoint,
        deployment,
        apiVersion,
        temperature,
      };
    }

    console.warn(
      'Azure provider selected but missing required environment variables. Falling back to WebLLM.',
    );
  }

  return {
    provider: 'webllm',
    model: import.meta.env?.VITE_AGENT_MODEL || DEFAULT_MODEL,
    temperature,
  };
}

export function AgentUIWrapper() {
  const llmConfig = useMemo(() => resolveLlmConfig(), []);

  const transport = useMemo(() => {
    return new LangGraphTransport({
      model: llmConfig.provider === 'webllm' ? llmConfig.model : undefined,
      maxIterations: 10,
      llm: llmConfig,
      // Tools can be added here later
      // tools: [/* custom tools */],
    });
  }, [llmConfig]);

  return <QweryAgentUI transport={transport} />;
}
