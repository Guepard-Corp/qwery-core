/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  LanguageModelV2,
  LanguageModelV2CallOptions,
  LanguageModelV2CallWarning,
  LanguageModelV2Content,
  LanguageModelV2FinishReason,
  LanguageModelV2Prompt,
  LanguageModelV2ResponseMetadata,
  LanguageModelV2StreamPart,
  LanguageModelV2Usage,
} from '@ai-sdk/provider';
import { LocalLLMConfig } from './types';

export class LocalLanguageModel implements LanguageModelV2 {
  readonly specificationVersion = 'v2' as const;
  readonly provider = 'local-llm';
  readonly modelId: string;
  readonly supportedUrls: Record<string, RegExp[]> = {};

  constructor(
    private readonly config: LocalLLMConfig,
    modelId?: string,
  ) {
    this.modelId = modelId ?? config.model;
  }

  async doGenerate(options: LanguageModelV2CallOptions) {
    const messages = this.formatMessages(options.prompt);

    console.log('[LocalLLM] Sending request:', {
      model: this.config.model,
      messageCount: messages.length,
    });

    const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages,
        max_tokens: this.config.maxTokens ?? 2048,
        temperature: this.config.temperature ?? 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[LocalLLM] HTTP Error:', response.status, errorText);
      throw new Error(`[LocalLLM] HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    if (!choice?.message?.content) {
      console.error('[LocalLLM] Invalid response:', data);
      throw new Error('[LocalLLM] No content in response');
    }

    let responseText = choice.message.content.trim();

    // Clean up the response - remove markdown code blocks if present
    if (responseText.startsWith('```json')) {
      responseText = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?$/g, '')
        .trim();
    } else if (responseText.startsWith('```')) {
      responseText = responseText.replace(/```\n?/g, '').trim();
    }

    // CRITICAL: Extract ONLY the JSON object, ignore any text before/after
    // Find the first { and last } to extract just the JSON
    const firstBrace = responseText.indexOf('{');
    const lastBrace = responseText.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      responseText = responseText.substring(firstBrace, lastBrace + 1).trim();

      console.log(
        '[LocalLLM] Extracted raw JSON:',
        responseText.substring(0, 300),
      );

      // Try to fix common JSON issues from small models
      try {
        const parsed = JSON.parse(responseText);

        // Fix missing or incorrect fields
        if (!('needsChart' in parsed)) {
          parsed.needsChart = false;
        }
        if (!('needsSQL' in parsed)) {
          parsed.needsSQL = false;
        }

        // Remove any extra fields that shouldn't be there
        const validFields = ['intent', 'complexity', 'needsChart', 'needsSQL'];
        for (const key of Object.keys(parsed)) {
          if (!validFields.includes(key)) {
            delete parsed[key];
          }
        }

        responseText = JSON.stringify(parsed);
        console.log('[LocalLLM] Cleaned JSON:', responseText);
      } catch (e) {
        console.log(
          '[LocalLLM] Could not pre-parse JSON for cleanup, will pass raw:',
          e instanceof Error ? e.message : String(e),
        );
        // Don't modify responseText, let the AI SDK try to parse it
      }
    }

    console.log('[LocalLLM] Final response:', responseText.substring(0, 200));

    const content: LanguageModelV2Content[] = [
      { type: 'text', text: responseText },
    ];

    const finishReason: LanguageModelV2FinishReason =
      (choice?.finish_reason as LanguageModelV2FinishReason) ?? 'stop';

    const usage: LanguageModelV2Usage = {
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
      totalTokens:
        (data.usage?.prompt_tokens ?? 0) + (data.usage?.completion_tokens ?? 0),
    };

    const warnings: LanguageModelV2CallWarning[] = [];
    const request = {
      body: JSON.stringify({ model: this.config.model, messages }),
    };
    const responseMeta: LanguageModelV2ResponseMetadata = {};

    return {
      content,
      finishReason,
      usage,
      warnings,
      request,
      response: responseMeta,
      rawCall: { rawPrompt: messages, rawSettings: {} },
    };
  }

  async doStream(_options: LanguageModelV2CallOptions): Promise<{
    stream: ReadableStream<LanguageModelV2StreamPart>;
    request?: { body?: unknown };
    response?: { headers?: Record<string, string> };
  }> {
    const stream = new ReadableStream<LanguageModelV2StreamPart>({
      start(controller) {
        controller.close();
      },
    });

    return {
      stream,
      response: { headers: {} },
    };
  }

  private formatMessages(prompt: LanguageModelV2Prompt) {
    const messages: Array<{ role: string; content: string }> = [];

    // Type guard to safely access prompt properties

    const promptAny = prompt as any;

    console.log('[LocalLLM] Formatting prompt:', {
      hasSystem: !!promptAny.system,
      hasMessages: !!promptAny.messages,
      messageCount: promptAny.messages?.length,
      promptKeys: Object.keys(promptAny),
      isArray: Array.isArray(promptAny),
      arrayLength: Array.isArray(promptAny) ? promptAny.length : 0,
    });

    // Check if prompt is an array (promptKeys: ['0', '1', ...])
    if (Array.isArray(promptAny)) {
      console.log('[LocalLLM] Prompt is an array, processing as message parts');

      for (const part of promptAny) {
        // Check if part has role and content array (standard message format)
        if (part.role && Array.isArray(part.content)) {
          let textContent = '';
          for (const contentPart of part.content) {
            if (contentPart.type === 'text' && contentPart.text) {
              textContent += contentPart.text;
            }
          }

          if (textContent) {
            messages.push({
              role: part.role,
              content: textContent,
            });
          }
        }
        // Fallback: check if part itself has type and text
        else if (part.type === 'text' && part.text) {
          messages.push({
            role: 'user',
            content: part.text,
          });
        }
        // Fallback: plain string
        else if (typeof part === 'string') {
          messages.push({
            role: 'user',
            content: part,
          });
        }
      }
    }

    // Check if this is an intent detection request (needs JSON)
    let isIntentDetection = false;

    if (promptAny.system && typeof promptAny.system === 'string') {
      isIntentDetection = promptAny.system.includes('intent');
    }

    if (promptAny.messages && Array.isArray(promptAny.messages)) {
      isIntentDetection =
        isIntentDetection ||
        promptAny.messages.some((m: any) =>
          m.content?.some?.(
            (p: any) =>
              p.text?.includes('intent') ||
              p.text?.includes('Return ONLY JSON'),
          ),
        );
    }

    if (isIntentDetection) {
      // Stronger JSON-only instruction for Phi-3
      messages.unshift({
        role: 'system',
        content: `You are a JSON API. You must respond ONLY with valid JSON. 
Do not include any text before or after the JSON.
Do not use markdown code blocks.
Do not add explanations.
Output format: {"key": "value"}`,
      });
    }

    // Add original system message
    if (promptAny.system && typeof promptAny.system === 'string') {
      messages.unshift({ role: 'system', content: promptAny.system });
    }

    // Handle messages array (if not already processed as array)
    if (
      !Array.isArray(promptAny) &&
      promptAny.messages &&
      Array.isArray(promptAny.messages)
    ) {
      for (const msg of promptAny.messages) {
        const content = msg.content

          .filter((p: any) => p.type === 'text')

          .map((p: any) => p.text)
          .join('');

        if (content) {
          messages.push({
            role: msg.role,
            content,
          });
        }
      }
    }

    // FALLBACK: If no messages were extracted, create a basic user message
    if (messages.length === 0) {
      console.warn(
        '[LocalLLM] No messages extracted from prompt, using fallback',
      );
      messages.push({
        role: 'user',
        content: 'Hello',
      });
    }

    // Add final reminder for JSON responses
    if (isIntentDetection && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.role === 'user') {
        lastMsg.content +=
          '\n\nRemember: Output ONLY valid JSON, no markdown, no explanation.';
      }
    }

    console.log('[LocalLLM] Formatted messages:', messages.length, 'messages');
    return messages;
  }
}
