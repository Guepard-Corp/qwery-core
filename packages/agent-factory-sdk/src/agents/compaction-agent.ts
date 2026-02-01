import { Agent } from './agent';
import { COMPACTION_PROMPT } from './prompts/compaction.prompt';

export const CompactionAgent = Agent.define('compaction', {
  name: 'Compaction',
  description: 'Agent for summarizing conversations.',
  mode: 'main',
  native: true,
  hidden: true,
  systemPrompt: COMPACTION_PROMPT,
  steps: 1,
  options: {},
});
