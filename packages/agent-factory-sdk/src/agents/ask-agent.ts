import { Agent } from './agent';
import { DEFAULT_SYSTEM_PROMPT } from './prompts/generic.prompt';

export const AskAgent = Agent.define('ask', {
  name: 'Ask',
  description:
    'General-purpose agent for questions and conversational assistance.',
  mode: 'main',
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  steps: 20,
  options: {},
});
