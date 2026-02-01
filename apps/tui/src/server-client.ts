import { spawn } from 'child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseJsonEventStream } from '@ai-sdk/provider-utils';
import {
  getToolName,
  isTextUIPart,
  isToolUIPart,
  readUIMessageStream,
  uiMessageChunkSchema,
  type UIMessage,
  type UIMessageChunk,
} from 'ai';
import type { ChatMessage, ToolCall } from './state/types.ts';

const DEFAULT_SERVER_URL = 'http://localhost:4096';

function getServerUrl(): string {
  return process.env.QWERY_SERVER_URL ?? DEFAULT_SERVER_URL;
}

export async function ensureServerRunning(): Promise<string> {
  const url = getServerUrl();
  try {
    const res = await fetch(`${url}/health`, {
      signal: AbortSignal.timeout(500),
    });
    if (res.ok) return url;
  } catch {
    // Server not running
  }

  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
  const serverEntry = join(root, 'apps', 'server', 'src', 'index.ts');

  spawn('bun', ['run', serverEntry], {
    cwd: root,
    stdio: 'ignore',
    detached: true,
    env: { ...process.env, PORT: '4096' },
  }).unref();

  const maxAttempts = 20;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const res = await fetch(`${url}/health`, {
        signal: AbortSignal.timeout(500),
      });
      if (res.ok) return url;
    } catch {
      // Retry
    }
  }

  throw new Error('Failed to start server');
}

export async function createConversation(
  baseUrl: string,
  title: string,
  seedMessage: string,
): Promise<{ slug: string }> {
  const res = await fetch(`${baseUrl}/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, seedMessage }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create conversation: ${err}`);
  }
  const text = await res.text();
  const contentType = res.headers.get('content-type') ?? '';
  const isHtml =
    contentType.includes('text/html') ||
    (text.trimStart().startsWith('<') && text.includes('</'));

  if (isHtml) {
    throw new Error(
      'Server returned HTML instead of JSON. You may be hitting the wrong URL (e.g. web app instead of server). Expected POST /conversations on the server (default http://localhost:4096).',
    );
  }

  try {
    return JSON.parse(text) as { slug: string };
  } catch {
    throw new Error(`Server returned invalid JSON: ${text.slice(0, 200)}`);
  }
}

export async function sendChatMessage(
  baseUrl: string,
  slug: string,
  messages: Array<{
    role: string;
    content: string;
    parts?: Array<{ type: string; text?: string }>;
  }>,
  model?: string,
): Promise<Response> {
  const body = {
    messages: messages.map((m) => ({
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      role: m.role,
      content: m.content,
      parts: m.parts ?? [{ type: 'text', text: m.content }],
    })),
    model: model ?? 'azure/gpt-5-mini',
  };

  return fetch(`${baseUrl}/chat/${slug}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function uiMessageToChatMessage(
  msg: UIMessage,
  startTime: number,
): ChatMessage {
  let content = '';
  const toolCalls: ToolCall[] = [];

  for (const part of msg.parts) {
    if (isTextUIPart(part)) {
      content += part.text ?? '';
    }
    if (
      isToolUIPart(part) &&
      part.state === 'output-available' &&
      part.output !== undefined
    ) {
      const name = getToolName(part);
      const output =
        typeof part.output === 'string'
          ? part.output
          : JSON.stringify(part.output ?? '');
      const args =
        typeof part.input === 'string'
          ? part.input
          : JSON.stringify(part.input ?? '');
      toolCalls.push({
        name,
        args,
        output,
        status: 'success',
      });
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1) + 's';

  return {
    role: 'assistant',
    content: content || 'No response.',
    toolCalls,
    model: 'Qwery',
    duration,
    timestamp: Date.now(),
  };
}

export async function parseStreamToChatMessage(
  res: Response,
  startTime: number,
): Promise<ChatMessage> {
  if (!res.body) {
    throw new Error('No response body');
  }

  const chunkStream = parseJsonEventStream({
    stream: res.body,
    schema: uiMessageChunkSchema,
  }).pipeThrough(
    new TransformStream({
      transform(
        part: { success: boolean; value?: UIMessageChunk; error?: unknown },
        controller,
      ) {
        if (part.success && part.value) {
          controller.enqueue(part.value);
        }
      },
    }),
  ) as ReadableStream<UIMessageChunk>;

  let lastMessage: UIMessage = { id: '', role: 'assistant', parts: [] };

  for await (const msg of readUIMessageStream({ stream: chunkStream })) {
    lastMessage = msg;
  }

  return uiMessageToChatMessage(lastMessage, startTime);
}
