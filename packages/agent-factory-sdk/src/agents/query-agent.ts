import { Agent } from './agent';

export const QueryAgent = Agent.define('query', {
  name: 'Query',
  description: 'Data and query-focused agent for executing and analyzing data.',
  mode: 'main',
  steps: 20,
  options: {},
});
