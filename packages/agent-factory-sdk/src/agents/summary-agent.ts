import { Agent } from './agent';
import { SUMMARY_PROMPT } from './prompts/summary.prompt';

export const SummaryAgent = Agent.define('summary', {
  name: 'Summary',
  description: 'Agent for summarizing conversations.',
  mode: 'main',
  native: true,
  hidden: true,
  systemPrompt: SUMMARY_PROMPT,
  steps: 1,
  options: { tools: { '*': false } },
});
