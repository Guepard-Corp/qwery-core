import { MockLanguageModelV3, simulateReadableStream } from 'ai/test';
import { runAgent } from './src/agent-loop';

const model = new MockLanguageModelV3({
  doStream: async () => ({
    stream: simulateReadableStream({
      chunks: [
        { type: 'stream-start', warnings: [] },
        { type: 'text-start', id: 't' },
        { type: 'text-delta', id: 't', delta: 'ok' },
        { type: 'text-end', id: 't' },
        { type: 'finish', finishReason: 'stop', usage: { inputTokens: 42, outputTokens: 13, totalTokens: 55 } },
      ],
      initialDelayInMs: 0,
      chunkDelayInMs: 0,
    }) as unknown as ReadableStream<never>,
  }),
});
const r = await runAgent({
  messages: [{ role: 'user', content: 'hi' }],
  compute: { runSql: async () => ({ columns: [], rows: [], rowCount: 0, durationMs: 0 }), describeSql: async () => ({ columns: [] }) },
  llm: { getModel: () => model as never },
  logger: { debug:()=>{}, info: (m, d) => console.error('I', m, JSON.stringify(d)), warn:()=>{}, error: (m, d) => console.error('E', m, JSON.stringify(d)) },
  onToolEvent: () => {},
  onToken: (d) => process.stderr.write(d),
  disableCompaction: true,
});
console.log('RESULT', JSON.stringify(r, null, 2));
