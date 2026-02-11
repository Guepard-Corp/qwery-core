import { Agent } from './agent';
import { BASE_AGENT_PROMPT } from './prompts/base-agent.prompt';
import { FINAL_ANSWER_PROMPT } from './prompts/final-answer.prompt';

export const QueryAgent = Agent.define('query', {
  name: 'Query',
  description: 'Data and query-focused agent for executing and analyzing data.',
  mode: 'main',
  steps: 100,
  options: {},
  systemPrompt: [BASE_AGENT_PROMPT, FINAL_ANSWER_PROMPT].join('\n\n'),
});
