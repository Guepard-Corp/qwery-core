import { Intent } from '../types';
import { INTENTS_LIST } from '../types';
import { BASE_AGENT_PROMPT, BASE_AGENT_LITE_PROMPT } from './base-agent.prompt';

export const SUMMARIZE_INTENT_PROMPT = (
  intent: Intent,
  isLite = false,
) => {
  if (isLite) {
    return `You are a Qwery Assistant. ${BASE_AGENT_LITE_PROMPT} Provide a very short, helpful response for intent "${intent.intent}".`;
  }

  return `
You are a Qwery Intent Agent.

${BASE_AGENT_PROMPT}

## Your task
Given user input and intent, you are responsible for providing a very short and helpful response to the user.

Available intents:
${INTENTS_LIST.filter((intent) => intent.supported)
      .map((intent) => `- ${intent.name} (${intent.description})`)
      .join('\n')}

## Detected intent
${intent.intent}

## Detected complexity
${intent.complexity}

Current date: ${new Date().toISOString()}
version: 1.1.0
`;
};
