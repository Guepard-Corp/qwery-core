import { generateText } from 'ai';
import { resolveModel } from './model-resolver';

const GENERATE_TITLE_PROMPT = (userMessage: string, agentResponse?: string) => {
  const basePrompt = `Based on the following conversation exchange, generate a concise, descriptive title for this conversation. The title should be:
- Maximum 60 characters
- Clear and specific to the conversation's topic and intent
- Not include quotes or special formatting
- Be a noun phrase or short sentence

User message: "${userMessage}"`;

  const fullPrompt = agentResponse
    ? `${basePrompt}

Agent response: "${agentResponse}"

Generate only the title, nothing else:`
    : `${basePrompt}

Generate only the title, nothing else:`;

  return fullPrompt;
};

export async function generateConversationTitle(
  userMessage: string,
  agentResponse?: string,
): Promise<string> {
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error('Title generation timeout after 10 seconds')),
        10000,
      );
    });

    const generatePromise = generateText({
      model: await resolveModel('ollama/mistral'),
      prompt: GENERATE_TITLE_PROMPT(userMessage, agentResponse),
    });

    const result = await Promise.race([generatePromise, timeoutPromise]);
    const title = result.text.trim();

    const cleanTitle = title
      .replace(/^["']|["']$/g, '')
      .trim()
      .slice(0, 60);

    return cleanTitle || 'New Conversation';
  } catch (error) {
    console.error('[generateConversationTitle] Error:', error);
    return 'New Conversation';
  }
}
