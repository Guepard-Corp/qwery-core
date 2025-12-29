import { Intent } from '../types';
import { fromPromise } from 'xstate/actors';
import { callLlamaCppDirectly } from '../../services/models/llamacpp-direct';
import { SUMMARIZE_INTENT_PROMPT } from '../prompts/summarize-intent.prompt';

export const summarizeIntent = async (
  text: string,
  _intent: Intent,
) => {
  console.log('[summarizeIntent] Input text:', text.substring(0, 200));

  const baseURL =
    process.env.LLAMACPP_BASE_URL || 'http://localhost:8000';
  const modelName = process.env.LLAMACPP_MODEL || 'mistral';

  const prompt = SUMMARIZE_INTENT_PROMPT(text, _intent);

  console.log('[summarizeIntent] Calling llamacpp directly');

  const responseText = await callLlamaCppDirectly(prompt, {
    baseURL,
    model: modelName,
  });

  console.log('[summarizeIntent] Got response:', responseText.substring(0, 100));

  // Create a StreamTextResult-like object with toUIMessageStreamResponse method
  // The factory-agent only needs this method to exist
  const result = {
    textStream: (async function* () {
      yield responseText;
    })(),
    fullStream: (async function* () {
      yield { type: 'text-delta', delta: responseText };
    })(),
    totalUsage: Promise.resolve({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    }),
    toUIMessageStreamResponse: (options: Record<string, unknown>) => {
      // Convert the response into the AI SDK format that the UI expects
      const encoder = new TextEncoder();

      console.log('[summarizeIntent] toUIMessageStreamResponse called');
      console.log('[summarizeIntent] Response text:', responseText.substring(0, 50));
      console.log('[summarizeIntent] Options keys:', Object.keys(options));

      const responseStream = new ReadableStream<Uint8Array>({
        async start(controller) {
          // Send in AI SDK format: each chunk is an SSE message with JSON data
          try {
            // Send text-start event
            const startEvent = `event: 0\ndata: ${JSON.stringify({
              type: 'text-start',
              id: 't1',
            })}\n\n`;
            controller.enqueue(encoder.encode(startEvent));
            console.log('[summarizeIntent] Sent text-start event');

            // Send text-delta event with the full response
            const textDeltaEvent = `event: 0\ndata: ${JSON.stringify({
              type: 'text-delta',
              id: 't1',
              delta: responseText,
            })}\n\n`;
            controller.enqueue(encoder.encode(textDeltaEvent));
            console.log('[summarizeIntent] Sent text-delta event');

            // Send text-end event
            const endEvent = `event: 0\ndata: ${JSON.stringify({
              type: 'text-end',
              id: 't1',
            })}\n\n`;
            controller.enqueue(encoder.encode(endEvent));
            console.log('[summarizeIntent] Sent text-end event');

            // Send finish event
            const finishEvent = `event: 0\ndata: ${JSON.stringify({
              type: 'finish',
              finishReason: 'stop',
              usage: {
                inputTokens: 0,
                outputTokens: 0,
              },
            })}\n\n`;
            controller.enqueue(encoder.encode(finishEvent));
            console.log('[summarizeIntent] Sent finish event');

            controller.close();
            console.log('[summarizeIntent] Stream closed');

            // Call onFinish callback if provided
            if (options.onFinish) {
              const generateMessageId = options.generateMessageId as (() => string) | undefined;
              setTimeout(() => {
                (options.onFinish as (arg: unknown) => Promise<void>)(
                  {
                    messages: [
                      {
                        id: generateMessageId?.() || 'temp-id',
                        role: 'assistant',
                        parts: [{ type: 'text', text: responseText }],
                      },
                    ],
                    finishReason: 'stop',
                  }
                ).catch((err: unknown) => {
                  console.error('[summarizeIntent] Error in onFinish:', err);
                });
              }, 0);
            }
          } catch (err) {
            console.error('[summarizeIntent] Error in stream start:', err);
            controller.error(err);
          }
        },
      });

      return new Response(responseStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    },
  };

  return result;
};

export const summarizeIntentActor = fromPromise(
  async ({
    input,
  }: {
    input: {
      inputMessage: string;
      intent: Intent;
      model: string;
    };
  }) => {
    const result = await summarizeIntent(
      input.inputMessage,
      input.intent,
    );
    return result;
  },
);
