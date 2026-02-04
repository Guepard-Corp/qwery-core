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
import type {
  ChatMessage,
  ToolCall,
  StreamingToolCall,
} from './state/types.ts';

const DEFAULT_SERVER_URL = 'http://localhost:4096';

function getServerUrl(): string {
  return process.env.QWERY_SERVER_URL ?? DEFAULT_SERVER_URL;
}

export function apiBase(root?: string): string {
  const base = (root ?? getServerUrl()).replace(/\/$/, '');
  return `${base}/api`;
}

export interface WorkspaceInit {
  projectId: string | null;
  userId: string;
  username: string;
}

export async function initWorkspace(
  baseUrl: string,
  options?: { runtime?: string },
): Promise<WorkspaceInit> {
  const res = await fetch(`${baseUrl}/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runtime: options?.runtime ?? 'desktop' }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Init failed: ${err}`);
  }
  const data = (await res.json()) as {
    user?: { id?: string; username?: string };
    project?: { id?: string };
  };
  return {
    projectId: data.project?.id ?? null,
    userId: data.user?.id ?? '',
    username: data.user?.username ?? 'tui',
  };
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

export interface CreateConversationResult {
  id: string;
  slug: string;
  datasources?: string[];
}

export async function createConversation(
  baseUrl: string,
  title: string,
  seedMessage: string,
  options?: { projectId?: string; datasources?: string[] },
): Promise<CreateConversationResult> {
  const body: Record<string, unknown> = { title, seedMessage };
  if (options?.projectId) body.projectId = options.projectId;
  if (options?.datasources?.length) body.datasources = options.datasources;

  const res = await fetch(`${baseUrl}/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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
    const data = JSON.parse(text) as {
      id?: string;
      slug?: string;
      datasources?: string[];
    };
    return {
      id: data.id ?? '',
      slug: data.slug ?? '',
      datasources: data.datasources,
    };
  } catch {
    throw new Error(`Server returned invalid JSON: ${text.slice(0, 200)}`);
  }
}

export async function updateConversation(
  baseUrl: string,
  conversationId: string,
  payload: { datasources?: string[] },
): Promise<void> {
  const res = await fetch(`${baseUrl}/conversations/${conversationId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, updatedBy: 'tui' }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to update conversation: ${err}`);
  }
}

export async function getConversation(
  baseUrl: string,
  slugOrId: string,
): Promise<{ id: string; slug: string; datasources?: string[] }> {
  const res = await fetch(
    `${baseUrl}/conversations/${encodeURIComponent(slugOrId)}`,
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to get conversation: ${err}`);
  }
  const data = (await res.json()) as {
    id?: string;
    slug?: string;
    datasources?: string[];
  };
  return {
    id: data.id ?? '',
    slug: data.slug ?? '',
    datasources: data.datasources,
  };
}

export async function getDatasources(
  baseUrl: string,
  projectId: string,
): Promise<Array<{ id: string; name: string; slug?: string }>> {
  const res = await fetch(
    `${baseUrl}/datasources?projectId=${encodeURIComponent(projectId)}`,
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to get datasources: ${err}`);
  }
  const list = (await res.json()) as Array<{
    id?: string;
    name?: string;
    slug?: string;
  }>;
  return list.map((d) => ({
    id: d.id ?? '',
    name: d.name ?? '',
    slug: d.slug,
  }));
}

export interface CreateDatasourceInput {
  projectId: string;
  name: string;
  description?: string;
  datasource_provider: string;
  datasource_driver: string;
  datasource_kind: string;
  config?: Record<string, unknown>;
  createdBy: string;
}

export type TestConnectionPayload = {
  datasource_provider: string;
  datasource_driver: string;
  datasource_kind: string;
  name: string;
  config: Record<string, unknown>;
};

const TEST_CONNECTION_TIMEOUT_MS = 15_000;

export async function testConnection(
  baseUrl: string,
  payload: TestConnectionPayload,
): Promise<{
  success: boolean;
  error?: string;
  data?: { connected: boolean; message: string };
}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    TEST_CONNECTION_TIMEOUT_MS,
  );
  try {
    const res = await fetch(`${baseUrl}/driver/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'testConnection',
        datasourceProvider: payload.datasource_provider,
        driverId: (payload.config as { driverId?: string }).driverId,
        config: payload.config,
      }),
      signal: controller.signal,
    });
    const data = (await res.json()) as {
      success?: boolean;
      error?: string;
      data?: { connected: boolean; message: string };
    };
    if (!res.ok) {
      return { success: false, error: data.error || `HTTP ${res.status}` };
    }
    return {
      success: data.success ?? false,
      error: data.error,
      data: data.data,
    };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { success: false, error: 'Connection test timed out' };
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function connectionToRawConfig(
  connection: string,
): Record<string, unknown> {
  const rawConfig: Record<string, unknown> = {};
  const value = connection.trim();
  if (!value) return rawConfig;
  rawConfig.connectionUrl = value;
  rawConfig.connectionString = value;
  rawConfig.url = value;
  rawConfig.sharedLink = value;
  rawConfig.jsonUrl = value;
  return rawConfig;
}

export function validateProviderConfig(
  provider: string,
  config: Record<string, unknown>,
): string | null {
  if (!provider) return 'Extension provider not found';
  if (provider === 'gsheet-csv') {
    if (!(config.sharedLink || config.url)) {
      return 'Please provide a Google Sheets shared link';
    }
  } else if (provider === 'json-online') {
    if (!(config.jsonUrl || config.url || config.connectionUrl)) {
      return 'Please provide a JSON file URL (jsonUrl, url, or connectionUrl)';
    }
  } else if (provider === 'parquet-online') {
    if (!(config.url || config.connectionUrl)) {
      return 'Please provide a Parquet file URL (url or connectionUrl)';
    }
  } else if (provider === 's3') {
    if (!config.bucket) return 'Please provide an S3 bucket name';
    if (!config.region) return 'Please provide an S3 region';
    if (!config.aws_access_key_id || !config.aws_secret_access_key) {
      return 'Please provide access key ID and secret access key';
    }
    if (
      !config.format ||
      !['parquet', 'json'].includes(config.format as string)
    ) {
      return 'Please select file format (Parquet or JSON)';
    }
  } else if (
    provider !== 'duckdb' &&
    provider !== 'duckdb-wasm' &&
    provider !== 'pglite'
  ) {
    if (!(config.connectionUrl || config.host)) {
      return 'Please provide either a connection URL or connection details (host is required)';
    }
  }
  return null;
}

export function normalizeProviderConfig(
  provider: string,
  config: Record<string, unknown>,
): Record<string, unknown> {
  if (!provider) return config;
  if (provider === 'gsheet-csv') {
    return { sharedLink: config.sharedLink || config.url };
  }
  if (provider === 'json-online') {
    return { jsonUrl: config.jsonUrl || config.url || config.connectionUrl };
  }
  if (provider === 'parquet-online') {
    return { url: config.url || config.connectionUrl };
  }
  if (provider === 's3') {
    const normalized: Record<string, unknown> = {
      provider: config.provider ?? 'aws',
      aws_access_key_id: config.aws_access_key_id,
      aws_secret_access_key: config.aws_secret_access_key,
      region: config.region,
      endpoint_url: config.endpoint_url,
      bucket: config.bucket,
      prefix: config.prefix,
      format: config.format ?? 'parquet',
      includes: config.includes,
      excludes: config.excludes,
    };
    Object.keys(normalized).forEach((key) => {
      const value = normalized[key];
      if (
        value === '' ||
        value === undefined ||
        (Array.isArray(value) && value.length === 0)
      ) {
        delete normalized[key];
      }
    });
    return normalized;
  }
  if (
    provider === 'duckdb' ||
    provider === 'duckdb-wasm' ||
    provider === 'pglite'
  ) {
    return config.database ? { database: config.database } : {};
  }
  if (config.connectionUrl) {
    return { connectionUrl: config.connectionUrl };
  }
  const normalized = { ...config };
  delete normalized.connectionUrl;
  Object.keys(normalized).forEach((key) => {
    if (
      key !== 'password' &&
      (normalized[key] === '' || normalized[key] === undefined)
    ) {
      delete normalized[key];
    }
  });
  return normalized;
}

export async function createDatasource(
  baseUrl: string,
  body: CreateDatasourceInput,
): Promise<{ id: string; name: string; slug?: string }> {
  const res = await fetch(`${baseUrl}/datasources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create datasource: ${err}`);
  }
  const data = (await res.json()) as {
    id?: string;
    name?: string;
    slug?: string;
  };
  return {
    id: data.id ?? '',
    name: data.name ?? '',
    slug: data.slug,
  };
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
  datasources?: string[],
): Promise<Response> {
  type MessagePayload = {
    id: string;
    role: string;
    content: string;
    parts: Array<{ type: string; text?: string }>;
  };
  const body: {
    messages: MessagePayload[];
    model: string;
    datasources?: string[];
  } = {
    messages: messages.map(
      (m): MessagePayload => ({
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        role: m.role,
        content: m.content,
        parts: m.parts ?? [{ type: 'text', text: m.content }],
      }),
    ),
    model: model ?? 'azure/gpt-5-mini',
  };
  if (datasources?.length) body.datasources = datasources;

  return fetch(`${baseUrl}/chat/${slug}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function uiMessageToStreamingPartial(msg: UIMessage): {
  content: string;
  toolCalls: StreamingToolCall[];
} {
  let content = '';
  const toolCalls: StreamingToolCall[] = [];
  for (const part of msg.parts) {
    if (isTextUIPart(part)) {
      content += part.text ?? '';
    }
    if (isToolUIPart(part)) {
      const name = getToolName(part);
      const status =
        part.state === 'output-available' || part.state === 'output-error'
          ? part.state === 'output-error'
            ? 'error'
            : 'success'
          : 'running';
      toolCalls.push({ name, status });
    }
  }
  return { content, toolCalls };
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

export async function parseStreamToChatMessageStreaming(
  res: Response,
  startTime: number,
  onUpdate: (content: string, toolCalls: StreamingToolCall[]) => void,
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
    const { content, toolCalls } = uiMessageToStreamingPartial(msg);
    onUpdate(content, toolCalls);
  }

  return uiMessageToChatMessage(lastMessage, startTime);
}
