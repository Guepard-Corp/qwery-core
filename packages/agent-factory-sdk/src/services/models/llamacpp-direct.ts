/**
 * Direct HTTP-based integration with llama.cpp
 * Bypasses the Vercel AI SDK to avoid compatibility issues with llama.cpp
 */

interface LlamaCppConfig {
  baseURL: string;
  model: string;
}

export async function callLlamaCppDirectly(
  prompt: string,
  config: LlamaCppConfig,
): Promise<string> {
  console.log('[callLlamaCppDirectly] Prompt length:', prompt.length, 'chars');
  console.log('[callLlamaCppDirectly] First 200 chars:', prompt.substring(0, 200));
  console.log('[callLlamaCppDirectly] FULL PROMPT:', prompt);
  
  const url = `${config.baseURL}/v1/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 512,
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `llama.cpp API error: ${response.status} ${response.statusText} - ${JSON.stringify(error)}`,
    );
  }

  const data = await response.json();

  // Extract the text from the response
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('Invalid response format from llama.cpp');
  }

  const content = data.choices[0].message.content;
  console.log('[callLlamaCppDirectly] Response length:', content.length, 'chars');
  console.log('[callLlamaCppDirectly] Response:', content);
  console.log('[callLlamaCppDirectly] Finish reason:', data.choices[0].finish_reason);
  
  return content;
}
