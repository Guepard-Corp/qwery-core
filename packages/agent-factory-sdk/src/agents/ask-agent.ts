import { Agent } from './agent';

export const AskAgent = Agent.define('ask', {
  name: 'Ask',
  description:
    'General-purpose agent for questions and conversational assistance.',
  mode: 'main',
  steps: 100,
  options: {},
});
