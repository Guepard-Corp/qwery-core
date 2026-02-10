import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Hono } from 'hono';

import { createTestApp, cleanupTestDir } from './helpers/setup';

const MCP_ACCEPT = 'application/json, text/event-stream';
const MCP_PROTOCOL_VERSION = '2024-11-05';

async function parseSseResponse(res: Response): Promise<unknown[]> {
  const text = await res.text();
  const results: unknown[] = [];
  for (const line of text.split('\n')) {
    if (line.startsWith('data: ')) {
      const payload = line.slice(6).trim();
      if (payload) {
        try {
          results.push(JSON.parse(payload));
        } catch {
          // skip non-JSON lines
        }
      }
    }
  }
  return results;
}

function findJsonRpcResult(messages: unknown[], id: number): unknown {
  const msg = messages.find(
    (m): m is { id?: number; result?: unknown } =>
      typeof m === 'object' &&
      m !== null &&
      'id' in m &&
      (m as { id?: number }).id === id &&
      'result' in m,
  );
  return msg && 'result' in msg
    ? (msg as { result: unknown }).result
    : undefined;
}

async function mcpInitialize(app: Hono): Promise<string> {
  const res = await app.request('http://localhost/mcp', {
    method: 'POST',
    headers: {
      Accept: MCP_ACCEPT,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0' },
      },
    }),
  });
  expect(res.status).toBe(200);
  const sessionId = res.headers.get('mcp-session-id');
  expect(sessionId).toBeTruthy();
  await res.body?.cancel();
  return sessionId!;
}

async function mcpPost(
  app: Hono,
  sessionId: string,
  method: string,
  params?: Record<string, unknown>,
  id = 1,
): Promise<unknown> {
  const res = await app.request('http://localhost/mcp', {
    method: 'POST',
    headers: {
      Accept: MCP_ACCEPT,
      'Content-Type': 'application/json',
      'mcp-session-id': sessionId,
      'mcp-protocol-version': MCP_PROTOCOL_VERSION,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id,
      method,
      params: params ?? {},
    }),
  });
  expect(res.status).toBe(200);
  const messages = await parseSseResponse(res);
  const result = findJsonRpcResult(messages, id);
  expect(result).toBeDefined();
  return result;
}

async function ensureProject(app: Hono): Promise<string> {
  let orgListRes = await app.request('http://localhost/api/organizations');
  let orgs = (await orgListRes.json()) as Array<{ id: string }>;
  if (orgs.length === 0) {
    const createOrgRes = await app.request(
      'http://localhost/api/organizations',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'MCP Test Org',
          userId: '550e8400-e29b-41d4-a716-446655440000',
          createdBy: 'test',
        }),
      },
    );
    expect(createOrgRes.status).toBe(201);
    orgListRes = await app.request('http://localhost/api/organizations');
    orgs = (await orgListRes.json()) as Array<{ id: string }>;
  }
  const orgId = orgs[0]!.id;
  const createProjRes = await app.request('http://localhost/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'MCP Test Project',
      organizationId: orgId,
      createdBy: 'test',
    }),
  });
  expect(createProjRes.status).toBe(201);
  const project = (await createProjRes.json()) as { id: string };
  return project.id;
}

describe('MCP handler', () => {
  let app: Hono;
  let testDir: string;
  let sessionId: string;
  let projectId: string;

  beforeAll(async () => {
    const out = await createTestApp();
    app = out.app;
    testDir = out.testDir;
    projectId = await ensureProject(app);
    sessionId = await mcpInitialize(app);
  });

  afterAll(async () => {
    await cleanupTestDir(testDir);
  });

  describe('tools/list', () => {
    it('lists all tools including datasource and notebook tools', async () => {
      const result = (await mcpPost(app, sessionId, 'tools/list')) as {
        tools?: { name: string }[];
      };
      expect(result.tools).toBeDefined();
      const names = result.tools!.map((t) => t.name);
      expect(names).toContain('create_datasource');
      expect(names).toContain('list_datasources');
      expect(names).toContain('add_datasource_to_conversation');
      expect(names).toContain('remove_datasource_from_conversation');
      expect(names).toContain('list_notebooks');
      expect(names).toContain('create_notebook');
      expect(names).toContain('get_notebook');
      expect(names).toContain('update_notebook');
      expect(names).toContain('list_datasource_providers');
      expect(names).toContain('get_datasource_provider');
    });
  });

  describe('list_datasource_providers', () => {
    it('returns array of provider metadata', async () => {
      const result = (await mcpPost(app, sessionId, 'tools/call', {
        name: 'list_datasource_providers',
        arguments: {},
      })) as { isError?: boolean; content?: { type: string; text: string }[] };
      if (result.isError) {
        const errText = result.content?.find((c) => c.type === 'text')?.text;
        throw new Error(errText ?? 'list_datasource_providers failed');
      }
      const text = result.content?.find((c) => c.type === 'text')?.text;
      expect(text).toBeDefined();
      const data = JSON.parse(text!) as Array<{
        id: string;
        name: string;
        drivers?: unknown[];
      }>;
      expect(Array.isArray(data)).toBe(true);
      if (data.length > 0) {
        expect(data[0]).toHaveProperty('id');
        expect(data[0]).toHaveProperty('name');
        expect(data[0]).toHaveProperty('drivers');
      }
    });
  });

  describe('get_datasource_provider', () => {
    it('returns full provider definition for known provider', async () => {
      const result = (await mcpPost(app, sessionId, 'tools/call', {
        name: 'get_datasource_provider',
        arguments: { providerId: 'postgresql' },
      })) as { isError?: boolean; content?: { type: string; text: string }[] };
      if (result.isError) {
        const errText = result.content?.find((c) => c.type === 'text')?.text;
        throw new Error(errText ?? 'get_datasource_provider failed');
      }
      const text = result.content?.find((c) => c.type === 'text')?.text;
      expect(text).toBeDefined();
      const def = JSON.parse(text!) as {
        id: string;
        name: string;
        schema?: unknown;
        formConfig?: unknown;
        drivers?: unknown[];
      };
      expect(def.id).toBe('postgresql');
      expect(def.name).toBeDefined();
      expect(def.schema).toBeDefined();
      expect(Array.isArray(def.drivers)).toBe(true);
    });

    it('returns error for unknown provider', async () => {
      const result = (await mcpPost(app, sessionId, 'tools/call', {
        name: 'get_datasource_provider',
        arguments: { providerId: 'nonexistent-provider-xyz' },
      })) as { isError?: boolean; content?: { type: string; text: string }[] };
      const text = result.content?.find((c) => c.type === 'text')?.text;
      expect(text).toBeDefined();
      const parsed = JSON.parse(text!) as { error?: string };
      expect(parsed.error).toBeDefined();
      expect(parsed.error).toContain('not found');
    });
  });

  describe('list_notebooks', () => {
    it('returns array of notebooks', async () => {
      const result = (await mcpPost(app, sessionId, 'tools/call', {
        name: 'list_notebooks',
        arguments: {},
      })) as { content?: { type: string; text: string }[] };
      expect(result.content).toBeDefined();
      const text = result.content!.find((c) => c.type === 'text')?.text;
      expect(text).toBeDefined();
      const data = JSON.parse(text!);
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('create_notebook and get_notebook', () => {
    it('creates notebook and gets it by id', async () => {
      const createResult = (await mcpPost(app, sessionId, 'tools/call', {
        name: 'create_notebook',
        arguments: {
          project: projectId,
          title: 'MCP Test Notebook',
        },
      })) as { isError?: boolean; content?: { type: string; text: string }[] };
      if (createResult.isError) {
        const errText = createResult.content?.find(
          (c) => c.type === 'text',
        )?.text;
        throw new Error(errText ?? 'create_notebook failed');
      }
      const createText = createResult.content?.find(
        (c) => c.type === 'text',
      )?.text;
      expect(createText).toBeDefined();
      const created = JSON.parse(createText!) as { id: string; title: string };
      expect(created.id).toBeDefined();
      expect(created.title).toBe('MCP Test Notebook');

      const getResult = (await mcpPost(app, sessionId, 'tools/call', {
        name: 'get_notebook',
        arguments: { id: created.id },
      })) as { content?: { type: string; text: string }[] };
      const getText = getResult.content?.find((c) => c.type === 'text')?.text;
      expect(getText).toBeDefined();
      const got = JSON.parse(getText!) as { id: string; title: string };
      expect(got.id).toBe(created.id);
      expect(got.title).toBe('MCP Test Notebook');
    });
  });

  describe('update_notebook', () => {
    it('updates notebook title', async () => {
      const createResult = (await mcpPost(app, sessionId, 'tools/call', {
        name: 'create_notebook',
        arguments: { project: projectId, title: 'To Update' },
      })) as { isError?: boolean; content?: { type: string; text: string }[] };
      if (createResult.isError) {
        const errText = createResult.content?.find(
          (c) => c.type === 'text',
        )?.text;
        throw new Error(errText ?? 'create_notebook failed');
      }
      const created = JSON.parse(
        createResult.content?.find((c) => c.type === 'text')?.text ?? '{}',
      ) as { id: string };

      const updateResult = (await mcpPost(app, sessionId, 'tools/call', {
        name: 'update_notebook',
        arguments: { id: created.id, title: 'Updated Title' },
      })) as { isError?: boolean; content?: { type: string; text: string }[] };
      if (updateResult.isError) {
        const errText = updateResult.content?.find(
          (c) => c.type === 'text',
        )?.text;
        throw new Error(errText ?? 'update_notebook failed');
      }
      const rawText = updateResult.content?.find(
        (c) => c.type === 'text',
      )?.text;
      expect(rawText).toBeDefined();
      const updated = JSON.parse(rawText ?? '{}') as {
        id?: string;
        title?: string;
        name?: string;
        error?: string;
      };
      if (updated.error) throw new Error(updated.error);
      expect(updated.id).toBe(created.id);
      expect(updated.title).toBe('Updated Title');
    });
  });

  describe('list_datasources', () => {
    it('returns array when project provided', async () => {
      const result = (await mcpPost(app, sessionId, 'tools/call', {
        name: 'list_datasources',
        arguments: { project: projectId },
      })) as { isError?: boolean; content?: { type: string; text: string }[] };
      if (result.isError) {
        const errText = result.content?.find((c) => c.type === 'text')?.text;
        throw new Error(errText ?? 'list_datasources failed');
      }
      const text = result.content?.find((c) => c.type === 'text')?.text;
      expect(text).toBeDefined();
      const data = JSON.parse(text!);
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('resources/list and resources/templates/list', () => {
    it('resources/templates/list returns notebook and datasource templates', async () => {
      const result = (await mcpPost(
        app,
        sessionId,
        'resources/templates/list',
      )) as {
        resourceTemplates?: { name: string; uriTemplate: string }[];
      };
      expect(result.resourceTemplates).toBeDefined();
      const names = result.resourceTemplates!.map((t) => t.name);
      expect(names).toContain('notebook');
      expect(names).toContain('datasource');
    });

    it('resources/list returns notebook URIs after creating a notebook', async () => {
      const createResult = (await mcpPost(app, sessionId, 'tools/call', {
        name: 'create_notebook',
        arguments: { project: projectId, title: 'For Resources List' },
      })) as { isError?: boolean; content?: { type: string; text: string }[] };
      if (createResult.isError) {
        const errText = createResult.content?.find(
          (c) => c.type === 'text',
        )?.text;
        throw new Error(errText ?? 'create_notebook failed');
      }
      const created = JSON.parse(
        createResult.content?.find((c) => c.type === 'text')?.text ?? '{}',
      ) as { id: string };

      const listResult = (await mcpPost(app, sessionId, 'resources/list')) as {
        resources?: { uri: string; name: string }[];
      };
      expect(listResult.resources).toBeDefined();
      const notebookUris = listResult.resources!.filter((r) =>
        r.uri.startsWith('qwery://notebook/'),
      );
      expect(notebookUris.length).toBeGreaterThanOrEqual(1);
      expect(notebookUris.some((r) => r.uri.includes(created.id))).toBe(true);
    });
  });

  describe('resources/read', () => {
    it('reads notebook content by qwery URI after creating notebook', async () => {
      const createResult = (await mcpPost(app, sessionId, 'tools/call', {
        name: 'create_notebook',
        arguments: { project: projectId, title: 'Resource Read Test' },
      })) as { isError?: boolean; content?: { type: string; text: string }[] };
      if (createResult.isError) {
        const errText = createResult.content?.find(
          (c) => c.type === 'text',
        )?.text;
        throw new Error(errText ?? 'create_notebook failed');
      }
      const created = JSON.parse(
        createResult.content?.find((c) => c.type === 'text')?.text ?? '{}',
      ) as { id: string };

      const readResult = (await mcpPost(app, sessionId, 'resources/read', {
        uri: `qwery://notebook/${created.id}`,
      })) as { contents?: { uri: string; text?: string }[] };
      expect(readResult.contents).toBeDefined();
      expect(readResult.contents!.length).toBeGreaterThan(0);
      const text = readResult.contents![0].text;
      expect(text).toBeDefined();
      const notebook = JSON.parse(text!);
      expect(notebook.id).toBe(created.id);
      expect(notebook.title).toBe('Resource Read Test');
    });
  });
});
