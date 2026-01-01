import { z } from 'zod';
import { fromPromise } from 'xstate/actors';
import { INTENTS_LIST, IntentSchema } from '../types';

// Simplified prompt that works better with smaller models like Llama 2 7B
const createSimplePrompt = (text: string) => {
  return `Classify this user message into one category:

User message: "${text}"

Categories:
- greeting: hi, hello, hey
- goodbye: bye, see you
- system: questions about Qwery or the assistant
- read-data: asking for data, queries, or analysis
- other: everything else

Does it need a chart? (yes/no)
Does it need SQL? (yes/no)

Response format (JSON only):
{"intent":"category","complexity":"simple","needsChart":false,"needsSQL":false}

JSON:`;
};

export const detectIntent = async (text: string) => {
  const maxAttempts = 2;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const llamacppUrl = process.env.LLAMACPP_BASE_URL || 'http://localhost:8080';
      
      const promptText = createSimplePrompt(text);
      
      console.log('[detectIntent] Prompt length:', promptText.length, 'chars');
      
      // Call llama.cpp directly
      const response = await fetch(`${llamacppUrl}/completion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          n_predict: 100,
          temperature: 0.1,
          stop: ['\n', 'User:', 'user:', 'Human:'],
        }),
      });

      if (!response.ok) {
        throw new Error(`LlamaCPP returned status ${response.status}`);
      }

      const data = await response.json();
      let content = data.content.trim();
      
      console.log('[detectIntent] Raw response:', content);
      
      // Try multiple strategies to extract JSON
      let parsed: any = null;
      
      // Strategy 1: Direct parse
      try {
        parsed = JSON.parse(content);
        console.log('[detectIntent] Direct parse successful');
      } catch (e) {
        // Strategy 2: Find JSON object in response
        const jsonMatch = content.match(/\{[^}]*"intent"[^}]*\}/);
        if (jsonMatch) {
          console.log('[detectIntent] Extracted JSON:', jsonMatch[0]);
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          // Strategy 3: Build JSON from keywords
          console.log('[detectIntent] Falling back to keyword detection');
          
          const lowerText = text.toLowerCase();
          const lowerContent = content.toLowerCase();
          
          let intent = 'other';
          if (lowerText.match(/^(hi|hello|hey|good morning|good afternoon)/)) {
            intent = 'greeting';
          } else if (lowerText.match(/^(bye|goodbye|see you|later)/)) {
            intent = 'goodbye';
          } else if (lowerText.match(/(who are you|what is qwery|what can you do|help)/)) {
            intent = 'system';
          } else if (lowerText.match(/(show|query|select|data|table|find|get|list)/)) {
            intent = 'read-data';
          }
          
          const needsChart = lowerText.includes('chart') || 
                           lowerText.includes('graph') || 
                           lowerText.includes('visualize') ||
                           lowerText.includes('plot');
          
          const needsSQL = intent === 'read-data' || 
                          lowerText.includes('query') || 
                          lowerText.includes('select');
          
          parsed = {
            intent,
            complexity: 'simple',
            needsChart,
            needsSQL,
          };
        }
      }
      
      if (parsed) {
        console.log('[detectIntent] Parsed object:', parsed);
        
        // Ensure all required fields exist
        const intentObject = {
          intent: parsed.intent || 'other',
          complexity: parsed.complexity || 'simple',
          needsChart: parsed.needsChart === true || parsed.needsChart === 'true',
          needsSQL: parsed.needsSQL === true || parsed.needsSQL === 'true',
        };
        
        // Validate against schema
        const validated = IntentSchema.parse(intentObject);
        
        const matchedIntent = INTENTS_LIST.find(
          (intent) => intent.name === validated.intent,
        );

        if (!matchedIntent || matchedIntent.supported === false) {
          return {
            intent: 'other' as const,
            complexity: validated.complexity,
            needsChart: validated.needsChart ?? false,
            needsSQL: validated.needsSQL ?? false,
          };
        }

        return validated;
      }

      throw new Error('Could not parse JSON from response');
    } catch (error) {
      lastError = error;
      if (error instanceof Error) {
        console.error('[detectIntent] Error:', error.message);
      }

      if (attempt === maxAttempts) {
        break;
      }

      console.log(`[detectIntent] Attempt ${attempt} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.error(
    '[detectIntent] All attempts failed, falling back to other intent:',
    lastError instanceof Error ? lastError.message : String(lastError),
  );

  // Fallback response
  return {
    intent: 'other' as const,
    complexity: 'simple' as const,
    needsChart: false,
    needsSQL: false,
  };
};

export const detectIntentActor = fromPromise(
  async ({
    input,
  }: {
    input: {
      inputMessage: string;
      model: string;
    };
  }): Promise<z.infer<typeof IntentSchema>> => {
    try {
      const intent = await detectIntent(input.inputMessage);
      return intent;
    } catch (error) {
      console.error('[detectIntentActor] ERROR:', error);
      throw error;
    }
  },
);