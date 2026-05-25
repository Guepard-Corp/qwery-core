import { generateText, stepCountIs, streamText, tool } from 'ai';
import { z } from 'zod';
import { createFileConfigStore } from '../apps/cli/src/infra/config';
import { buildModel } from '../packages/adapters/llm-aisdk/src/index';

const configStore = createFileConfigStore();
const getActiveProvider = () => configStore.getActiveProvider();

const active = getActiveProvider();
if (!active) {
  console.error('No active provider configured. Run `bun start` and use /models first.');
  process.exit(1);
}

console.log('---- LLM diagnostic ----');
console.log('provider :', active.id);
console.log(
  'values   :',
  Object.fromEntries(
    Object.entries(active.values).map(([k, v]) =>
      /key|secret|token/i.test(k) ? [k, v ? '••••••' : ''] : [k, v],
    ),
  ),
);
console.log('------------------------\n');

const model = buildModel(active);

async function step(name: string, fn: () => Promise<void>): Promise<boolean> {
  process.stdout.write(`[${name}] running… `);
  try {
    await fn();
    console.log('OK');
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log('FAIL');
    console.log('  →', message);
    return false;
  }
}

const tools = {
  ping: tool({
    description: 'Returns the string "pong" — used to test tool/function calling.',
    inputSchema: z.object({}),
    execute: async () => ({ ok: true, reply: 'pong' }),
  }),
};

const messages = [{ role: 'user' as const, content: 'Say the single word: ready' }];

await step('1. generateText (no tools, no stream)', async () => {
  const { text } = await generateText({ model, messages });
  console.log('\n      sample:', JSON.stringify(text.slice(0, 80)));
});

await step('2. streamText (no tools)', async () => {
  const r = streamText({ model, messages });
  let buf = '';
  for await (const d of r.textStream) buf += d;
  console.log('\n      sample:', JSON.stringify(buf.slice(0, 80)));
});

await step('3. generateText (with tools, no stream)', async () => {
  const r = await generateText({
    model,
    messages: [{ role: 'user', content: 'Call the ping tool now.' }],
    tools,
    stopWhen: stepCountIs(3),
  });
  console.log(
    '\n      toolCalls:',
    r.toolCalls.map((c) => c.toolName),
  );
  console.log('      text     :', JSON.stringify(r.text.slice(0, 80)));
});

await step('4. streamText (with tools)', async () => {
  const r = streamText({
    model,
    messages: [{ role: 'user', content: 'Call the ping tool now.' }],
    tools,
    stopWhen: stepCountIs(3),
  });
  const calls: string[] = [];
  let buf = '';
  for await (const part of r.fullStream) {
    if (part.type === 'text-delta') buf += part.text;
    if (part.type === 'tool-call') calls.push(part.toolName);
    if (part.type === 'error') {
      throw new Error(part.error instanceof Error ? part.error.message : String(part.error));
    }
  }
  console.log('\n      toolCalls:', calls);
  console.log('      text     :', JSON.stringify(buf.slice(0, 80)));
});

console.log('\nDone.');
