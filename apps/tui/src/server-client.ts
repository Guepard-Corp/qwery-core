import { spawn } from 'child_process';
import { request as nodeHttpRequest } from 'node:http';
import { request as nodeHttpsRequest } from 'node:https';
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

let cachedServerUrl: string | null = null;

function getServerUrl(): string {
  return process.env.QWERY_SERVER_URL ?? DEFAULT_SERVER_URL;
}

export function apiBase(root?: string): string {
  const base = (root ?? getServerUrl()).replace(/\/$/, '');
  return `${base}/api`;
}

function nodePost(
  urlStr: string,
  body: string,
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const isHttps = urlStr.startsWith('https:');
    const request = isHttps ? nodeHttpsRequest : nodeHttpRequest;
    const req = request(
      urlStr,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body, 'utf8'),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () =>
          resolve({
            statusCode: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString('utf8'),
          }),
        );
        res.on('error', reject);
      },
    );
    req.on('error', reject);
    req.write(body, 'utf8');
    req.end();
  });
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
  if (cachedServerUrl) {
    try {
      const res = await fetch(`${cachedServerUrl}/health`, {
        signal: AbortSignal.timeout(500),
      });
      if (res.ok) return cachedServerUrl;
    } catch {
      cachedServerUrl = null;
    }
  }

  const url = getServerUrl();
  try {
    const res = await fetch(`${url}/health`, {
      signal: AbortSignal.timeout(500),
    });
    if (res.ok) {
      cachedServerUrl = url;
      return url;
    }
  } catch {
    // Server not running
  }

  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
  const serverEntry = join(root, 'apps', 'server', 'src', 'index.ts');
  const port = (url.startsWith('http') ? new URL(url).port : null) || '4096';
  spawn('bun', ['run', serverEntry], {
    cwd: root,
    stdio: 'ignore',
    detached: true,
    env: { ...process.env, PORT: port },
  }).unref();

  const maxAttempts = 20;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const res = await fetch(`${url}/health`, {
        signal: AbortSignal.timeout(500),
      });
      if (res.ok) {
        cachedServerUrl = url;
        return url;
      }
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

export interface ServerConversation {
  id: string;
  slug: string;
  title: string;
  datasources?: string[];
  createdAt: string;
  updatedAt: string;
}

export async function getConversationsByProjectId(
  baseUrl: string,
  projectId: string,
): Promise<ServerConversation[]> {
  const res = await fetch(
    `${baseUrl}/conversations/project/${encodeURIComponent(projectId)}`,
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to list conversations: ${err}`);
  }
  const data = (await res.json()) as Array<{
    id?: string;
    slug?: string;
    title?: string;
    datasources?: string[];
    createdAt?: string | number | Date;
    updatedAt?: string | number | Date;
  }>;
  return (data ?? []).map((c) => ({
    id: c.id ?? '',
    slug: c.slug ?? '',
    title: c.title ?? 'New Conversation',
    datasources: c.datasources,
    createdAt:
      typeof c.createdAt === 'string'
        ? c.createdAt
        : typeof c.createdAt === 'number'
          ? String(c.createdAt)
          : c.createdAt instanceof Date
            ? c.createdAt.toISOString()
            : '',
    updatedAt:
      typeof c.updatedAt === 'string'
        ? c.updatedAt
        : typeof c.updatedAt === 'number'
          ? String(c.updatedAt)
          : c.updatedAt instanceof Date
            ? c.updatedAt.toISOString()
            : '',
  }));
}

interface ApiMessagePart {
  type?: string;
  text?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  toolName?: string;
}

interface ApiMessage {
  id?: string;
  role?: string;
  content?: { parts?: ApiMessagePart[] };
  metadata?: { modelId?: string };
  createdAt?: string | number | Date;
}

function apiMessageToChatMessage(m: ApiMessage): ChatMessage {
  let content = '';
  const toolCalls: ToolCall[] = [];
  const parts = m.content?.parts ?? [];
  for (const part of parts) {
    if (part.type === 'text' && part.text != null) {
      content += part.text;
    }
    if (
      part.type &&
      part.type.startsWith('tool-') &&
      (part.state === 'output-available' || part.output !== undefined)
    ) {
      const name = part.toolName ?? part.type.replace(/^tool-/, '');
      const output =
        typeof part.output === 'string'
          ? part.output
          : JSON.stringify(part.output ?? '');
      const args =
        typeof part.input === 'string'
          ? part.input
          : JSON.stringify(part.input ?? '');
      toolCalls.push({ name, args, output, status: 'success' });
    }
  }
  const createdAt =
    m.createdAt instanceof Date
      ? m.createdAt.getTime()
      : typeof m.createdAt === 'string'
        ? new Date(m.createdAt).getTime()
        : typeof m.createdAt === 'number'
          ? m.createdAt
          : Date.now();
  return {
    role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
    content: content || (toolCalls.length ? '(tool calls)' : ''),
    toolCalls,
    model: (m.metadata as { modelId?: string })?.modelId ?? '',
    duration: '',
    timestamp: createdAt,
  };
}

export async function getMessages(
  baseUrl: string,
  conversationSlug: string,
): Promise<ChatMessage[]> {
  const res = await fetch(
    `${baseUrl}/messages?conversationSlug=${encodeURIComponent(conversationSlug)}`,
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to get messages: ${err}`);
  }
  const data = (await res.json()) as ApiMessage[];
  return (data ?? []).map(apiMessageToChatMessage);
}

export interface NotebookCell {
  cellId: number;
  cellType: string;
  query?: string;
  datasources: string[];
  isActive: boolean;
  runMode: string;
  title?: string;
}

export interface TuiNotebook {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  slug: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  datasources: string[];
  cells: NotebookCell[];
  createdBy?: string;
  isPublic?: boolean;
}

export async function getNotebooks(
  baseUrl: string,
  projectId: string,
): Promise<TuiNotebook[]> {
  const res = await fetch(
    `${baseUrl}/notebooks?projectId=${encodeURIComponent(projectId)}`,
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to list notebooks: ${err}`);
  }
  const data = (await res.json()) as Array<Record<string, unknown>>;
  return (data ?? []).map(normalizeNotebook);
}

export async function getNotebook(
  baseUrl: string,
  idOrSlug: string,
): Promise<TuiNotebook> {
  const res = await fetch(
    `${baseUrl}/notebooks/${encodeURIComponent(idOrSlug)}`,
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to get notebook: ${err}`);
  }
  const data = (await res.json()) as Record<string, unknown>;
  return normalizeNotebook(data);
}

function normalizeNotebook(n: Record<string, unknown>): TuiNotebook {
  const cells = (n.cells as NotebookCell[] | undefined) ?? [];
  return {
    id: (n.id as string) ?? '',
    projectId: (n.projectId as string) ?? '',
    title: (n.title as string) ?? 'Notebook',
    description: n.description as string | undefined,
    slug: (n.slug as string) ?? '',
    version: typeof n.version === 'number' ? n.version : 1,
    createdAt:
      n.createdAt instanceof Date
        ? n.createdAt.toISOString()
        : typeof n.createdAt === 'string'
          ? n.createdAt
          : '',
    updatedAt:
      n.updatedAt instanceof Date
        ? n.updatedAt.toISOString()
        : typeof n.updatedAt === 'string'
          ? n.updatedAt
          : '',
    datasources: Array.isArray(n.datasources)
      ? (n.datasources as string[])
      : [],
    cells: cells.map((c) => ({
      cellId: c.cellId ?? 0,
      cellType: c.cellType ?? 'query',
      query: c.query,
      datasources: Array.isArray(c.datasources) ? c.datasources : [],
      isActive: c.isActive ?? true,
      runMode: c.runMode ?? 'default',
      title: c.title,
    })),
    createdBy: n.createdBy as string | undefined,
    isPublic: n.isPublic as boolean | undefined,
  };
}

export async function createNotebook(
  baseUrl: string,
  body: {
    projectId: string;
    title: string;
    description?: string;
    createdBy?: string;
  },
): Promise<TuiNotebook> {
  const res = await fetch(`${baseUrl}/notebooks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create notebook: ${err}`);
  }
  const data = (await res.json()) as Record<string, unknown>;
  return normalizeNotebook(data);
}

export async function updateNotebook(
  baseUrl: string,
  id: string,
  body: Partial<{ title: string; description: string; cells: NotebookCell[] }>,
): Promise<TuiNotebook> {
  const res = await fetch(`${baseUrl}/notebooks/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to update notebook: ${err}`);
  }
  const data = (await res.json()) as Record<string, unknown>;
  return normalizeNotebook(data);
}

export interface RunNotebookQueryResult {
  success: boolean;
  data?: {
    rows: Record<string, unknown>[];
    headers: { name: string; displayName?: string; originalType?: string }[];
    stat?: unknown;
  };
  error?: string;
}

export async function runNotebookQuery(
  baseUrl: string,
  params: { conversationId: string; query: string; datasourceId: string },
): Promise<RunNotebookQueryResult> {
  const { statusCode, body: raw } = await nodePost(
    `${baseUrl}/notebook/query`,
    JSON.stringify(params),
  );
  let data: {
    success?: boolean;
    data?: RunNotebookQueryResult['data'];
    error?: string;
  };
  try {
    data = raw ? (JSON.parse(raw) as typeof data) : {};
  } catch {
    const preview = raw.slice(0, 200).replace(/\s+/g, ' ');
    return {
      success: false,
      error: `Server returned non-JSON (${statusCode}). Body: ${preview}${raw.length > 200 ? '…' : ''}`,
    };
  }
  if (statusCode < 200 || statusCode >= 300) {
    return { success: false, error: data.error ?? `HTTP ${statusCode}` };
  }
  return {
    success: data.success ?? false,
    data: data.data,
    error: data.error,
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

export function fieldValuesToRawConfig(
  fieldValues: Record<string, string>,
  _typeId: string,
): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fieldValues)) {
    if (key === 'name' || value === '') continue;
    const v = value.trim();
    if (key === 'port' && v !== '') raw[key] = Number(v) || v;
    else if (v) raw[key] = v;
  }
  if (
    (raw.connectionUrl || raw.connectionString) &&
    !raw.url &&
    !raw.sharedLink &&
    !raw.jsonUrl
  ) {
    const u = (raw.connectionUrl || raw.connectionString) as string;
    raw.connectionUrl = u;
    raw.connectionString = u;
    raw.url = u;
    raw.sharedLink = u;
    raw.jsonUrl = u;
  }
  return raw;
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
  message: {
    role: string;
    content: string;
    parts?: Array<{ type: string; text?: string }>;
  },
  model?: string,
  datasources?: string[],
): Promise<Response> {
  type MessagePayload = {
    id: string;
    role: string;
    content: string;
    parts: Array<{ type: string; text?: string }>;
  };
  const payload: MessagePayload = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role: message.role,
    content: message.content,
    parts: message.parts ?? [{ type: 'text', text: message.content }],
  };
  const body: {
    messages: MessagePayload[];
    model: string;
    datasources?: string[];
  } = {
    messages: [payload],
    model: model ?? 'azure/gpt-5.2-chat',
  };
  if (datasources?.length) body.datasources = datasources;

  const url = `${baseUrl}/chat/${slug}`;
  const bodyStr = JSON.stringify(body);
  const { body: text } = await nodePost(url, bodyStr);
  return { text: () => Promise.resolve(text) } as Response;
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

async function responseBodyStream(
  res: Response,
): Promise<ReadableStream<Uint8Array>> {
  const text = await res.text();
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

export async function parseStreamToChatMessage(
  res: Response,
  startTime: number,
): Promise<ChatMessage> {
  const stream = await responseBodyStream(res);

  const chunkStream = parseJsonEventStream({
    stream,
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
  const stream = await responseBodyStream(res);

  const chunkStream = parseJsonEventStream({
    stream,
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
