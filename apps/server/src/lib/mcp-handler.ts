import {
  McpServer,
  ResourceTemplate,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';
import {
  CreateDatasourceService,
  CreateNotebookService,
  GetConversationBySlugService,
  GetConversationService,
  GetDatasourceService,
  GetDatasourceBySlugService,
  GetNotebookService,
  GetNotebookBySlugService,
  GetNotebooksByProjectIdService,
  GetProjectBySlugService,
  GetProjectService,
  UpdateConversationService,
  UpdateNotebookService,
} from '@qwery/domain/services';
import type { Repositories } from '@qwery/domain/repositories';
import { DomainException } from '@qwery/domain/exceptions';
import {
  getDiscoveredDatasource,
  getDiscoveredDatasources,
} from '@qwery/extensions-sdk';
import { instanceToPlain } from 'class-transformer';
import { getRepositories } from './repositories';
import { isUUID } from './http-utils';

function toSerializable(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(toSerializable);
  try {
    return instanceToPlain(value as object);
  } catch {
    return value;
  }
}

type SessionEntry = {
  transport: WebStandardStreamableHTTPServerTransport;
  mcpServer: McpServer;
};

const sessions = new Map<string, SessionEntry>();

function createMcpServer(getRepos: () => Promise<Repositories>): McpServer {
  const mcpServer = new McpServer(
    { name: 'qwery', version: '0.1.0' },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    },
  );

  const jsonContent = (data: unknown) => ({
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(toSerializable(data), null, 2),
      },
    ],
  });

  const errorContent = (message: string) => jsonContent({ error: message });

  const createDatasourceInputSchema = z
    .object({
      conversation: z
        .string()
        .optional()
        .describe(
          'Conversation id or slug to create the datasource in its project (XOR with project)',
        ),
      project: z
        .string()
        .optional()
        .describe(
          'Project id or slug to create the datasource in (XOR with conversation)',
        ),
      name: z.string().describe('Name of the datasource'),
      description: z.string().optional().describe('Optional description'),
      datasource_provider: z
        .string()
        .describe('Datasource provider identifier'),
      datasource_driver: z.string().describe('Datasource driver identifier'),
      datasource_kind: z
        .enum(['embedded', 'remote'])
        .describe('Kind of datasource: embedded or remote'),
      config: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Optional connection config'),
    })
    .refine(
      (data) => {
        const hasConv = Boolean(data.conversation?.trim());
        const hasProj = Boolean(data.project?.trim());
        return hasConv !== hasProj;
      },
      {
        message: 'Exactly one of conversation or project must be provided',
        path: ['conversation'],
      },
    );

  mcpServer.registerTool(
    'create_datasource',
    {
      title: 'Create datasource',
      description:
        'Create a new datasource for a project. Provide either conversation or project (id or slug, XOR). createdBy is inferred. Always uses domain use cases.',
      inputSchema: createDatasourceInputSchema,
    },
    async (args) => {
      const repos = await getRepos();
      const hasConversation = Boolean(args.conversation?.trim());
      let projectId: string;
      if (hasConversation && args.conversation) {
        const getConversation = isUUID(args.conversation.trim())
          ? new GetConversationService(repos.conversation)
          : new GetConversationBySlugService(repos.conversation);
        let conversation;
        try {
          conversation = await getConversation.execute(
            args.conversation.trim(),
          );
        } catch {
          return errorContent(`Conversation not found: ${args.conversation}`);
        }
        projectId = conversation.projectId;
      } else {
        const getProject = isUUID(args.project!.trim())
          ? new GetProjectService(repos.project)
          : new GetProjectBySlugService(repos.project);
        let project;
        try {
          project = await getProject.execute(args.project!.trim());
        } catch {
          return errorContent(`Project not found: ${args.project}`);
        }
        projectId = project.id;
      }
      const useCase = new CreateDatasourceService(repos.datasource);
      try {
        const datasource = await useCase.execute({
          projectId,
          name: args.name,
          description: args.description,
          datasource_provider: args.datasource_provider,
          datasource_driver: args.datasource_driver,
          datasource_kind: args.datasource_kind,
          config: args.config,
          createdBy: 'mcp',
        });
        return jsonContent(datasource);
      } catch (error) {
        const message =
          error instanceof DomainException
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Internal server error';
        return errorContent(message);
      }
    },
  );

  const listDatasourcesSchema = z
    .object({
      project: z.string().optional(),
      conversation: z.string().optional(),
    })
    .refine(
      (data) => {
        const hasProj = Boolean(data.project?.trim());
        const hasConv = Boolean(data.conversation?.trim());
        return hasProj !== hasConv;
      },
      {
        message: 'Exactly one of project or conversation must be provided',
      },
    );

  mcpServer.registerTool(
    'list_datasources',
    {
      title: 'List datasources',
      description:
        'List datasources for a project. Provide either project or conversation (id or slug, XOR).',
      inputSchema: listDatasourcesSchema,
    },
    async (args) => {
      const repos = await getRepos();
      let projectId: string;
      if (args.conversation?.trim()) {
        const getConversation = isUUID(args.conversation.trim())
          ? new GetConversationService(repos.conversation)
          : new GetConversationBySlugService(repos.conversation);
        let conversation;
        try {
          conversation = await getConversation.execute(
            args.conversation.trim(),
          );
        } catch {
          return errorContent(`Conversation not found: ${args.conversation}`);
        }
        projectId = conversation.projectId;
      } else {
        const getProject = isUUID(args.project!.trim())
          ? new GetProjectService(repos.project)
          : new GetProjectBySlugService(repos.project);
        let project;
        try {
          project = await getProject.execute(args.project!.trim());
        } catch {
          return errorContent(`Project not found: ${args.project}`);
        }
        projectId = project.id;
      }
      const datasources = await repos.datasource.findByProjectId(projectId);
      return jsonContent(datasources ?? []);
    },
  );

  mcpServer.registerTool(
    'list_datasource_providers',
    {
      title: 'List datasource providers',
      description:
        'List all available datasource providers (extension metadata: id, name, description, icon, drivers).',
      inputSchema: z.object({}),
    },
    async () => {
      const providers = await getDiscoveredDatasources();
      const list = providers.map((ds) => ({
        id: ds.id,
        name: ds.name,
        description: ds.description,
        icon: ds.icon,
        scope: ds.scope,
        packageName: ds.packageName,
        drivers: ds.drivers.map((d) => ({
          id: d.id,
          name: d.name,
          description: d.description,
          runtime: d.runtime,
          entry: d.entry,
          packageName: d.packageName,
        })),
      }));
      return jsonContent(list);
    },
  );

  const getDatasourceProviderSchema = z.object({
    providerId: z
      .string()
      .min(1)
      .describe('Datasource provider id (e.g. postgresql, duckdb-wasm, s3)'),
  });

  mcpServer.registerTool(
    'get_datasource_provider',
    {
      title: 'Get datasource provider definition',
      description:
        'Get full datasource provider definition: config schema (JSON Schema), formConfig, drivers, id, name, description, icon, and all fields needed to create or configure a datasource.',
      inputSchema: getDatasourceProviderSchema,
    },
    async (args) => {
      const provider = await getDiscoveredDatasource(args.providerId.trim());
      if (!provider) {
        return errorContent(
          `Datasource provider not found: ${args.providerId}`,
        );
      }
      const definition = {
        id: provider.id,
        name: provider.name,
        description: provider.description,
        icon: provider.icon,
        scope: provider.scope,
        packageName: provider.packageName,
        rawSchema: provider.rawSchema,
        formConfig: provider.formConfig ?? null,
        drivers: provider.drivers.map((d) => ({
          id: d.id,
          name: d.name,
          description: d.description,
          runtime: d.runtime,
          entry: d.entry,
          packageDir: d.packageDir,
          packageName: d.packageName,
        })),
      };
      return jsonContent(definition);
    },
  );

  const addDatasourceToConversationSchema = z.object({
    conversation: z.string().min(1),
    datasourceId: z.string().min(1),
  });

  mcpServer.registerTool(
    'add_datasource_to_conversation',
    {
      title: 'Add datasource to conversation',
      description:
        'Add a datasource to a conversation (discussion). conversation and datasourceId can be UUID or slug.',
      inputSchema: addDatasourceToConversationSchema,
    },
    async (args) => {
      const repos = await getRepos();
      const getConversation = isUUID(args.conversation.trim())
        ? new GetConversationService(repos.conversation)
        : new GetConversationBySlugService(repos.conversation);
      let conversation;
      try {
        conversation = await getConversation.execute(args.conversation.trim());
      } catch {
        return errorContent(`Conversation not found: ${args.conversation}`);
      }
      const getDatasource = isUUID(args.datasourceId.trim())
        ? new GetDatasourceService(repos.datasource)
        : new GetDatasourceBySlugService(repos.datasource);
      let datasource;
      try {
        datasource = await getDatasource.execute(args.datasourceId.trim());
      } catch {
        return errorContent(`Datasource not found: ${args.datasourceId}`);
      }
      if (datasource.projectId !== conversation.projectId) {
        return errorContent(
          'Datasource does not belong to the same project as the conversation',
        );
      }
      const existing = conversation.datasources ?? [];
      if (existing.includes(datasource.id)) {
        return jsonContent(conversation);
      }
      const updateConversation = new UpdateConversationService(
        repos.conversation,
      );
      try {
        const updated = await updateConversation.execute({
          id: conversation.id,
          datasources: [...existing, datasource.id],
          updatedBy: 'mcp',
        });
        return jsonContent(updated);
      } catch (error) {
        const message =
          error instanceof DomainException
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Internal server error';
        return errorContent(message);
      }
    },
  );

  const removeDatasourceFromConversationSchema = z.object({
    conversation: z.string().min(1),
    datasourceId: z.string().min(1),
  });

  mcpServer.registerTool(
    'remove_datasource_from_conversation',
    {
      title: 'Remove datasource from conversation',
      description:
        'Remove a datasource from a conversation. conversation and datasourceId can be UUID or slug.',
      inputSchema: removeDatasourceFromConversationSchema,
    },
    async (args) => {
      const repos = await getRepos();
      const getConversation = isUUID(args.conversation.trim())
        ? new GetConversationService(repos.conversation)
        : new GetConversationBySlugService(repos.conversation);
      let conversation;
      try {
        conversation = await getConversation.execute(args.conversation.trim());
      } catch {
        return errorContent(`Conversation not found: ${args.conversation}`);
      }
      const getDatasource = isUUID(args.datasourceId.trim())
        ? new GetDatasourceService(repos.datasource)
        : new GetDatasourceBySlugService(repos.datasource);
      let datasource;
      try {
        datasource = await getDatasource.execute(args.datasourceId.trim());
      } catch {
        return errorContent(`Datasource not found: ${args.datasourceId}`);
      }
      const existing = conversation.datasources ?? [];
      const next = existing.filter((id) => id !== datasource.id);
      if (next.length === existing.length) {
        return jsonContent(conversation);
      }
      const updateConversation = new UpdateConversationService(
        repos.conversation,
      );
      try {
        const updated = await updateConversation.execute({
          id: conversation.id,
          datasources: next,
          updatedBy: 'mcp',
        });
        return jsonContent(updated);
      } catch (error) {
        const message =
          error instanceof DomainException
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Internal server error';
        return errorContent(message);
      }
    },
  );

  const listNotebooksSchema = z.object({
    project: z.string().optional(),
  });

  mcpServer.registerTool(
    'list_notebooks',
    {
      title: 'List notebooks',
      description: 'List notebooks. Optionally filter by project (id or slug).',
      inputSchema: listNotebooksSchema,
    },
    async (args) => {
      const repos = await getRepos();
      if (args.project?.trim()) {
        const getProject = isUUID(args.project.trim())
          ? new GetProjectService(repos.project)
          : new GetProjectBySlugService(repos.project);
        let project;
        try {
          project = await getProject.execute(args.project.trim());
        } catch {
          return errorContent(`Project not found: ${args.project}`);
        }
        const useCase = new GetNotebooksByProjectIdService(repos.notebook);
        const notebooks = await useCase.execute(project.id);
        return jsonContent(notebooks ?? []);
      }
      const notebooks = await repos.notebook.findAll();
      return jsonContent(notebooks);
    },
  );

  const createNotebookSchema = z.object({
    project: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
  });

  mcpServer.registerTool(
    'create_notebook',
    {
      title: 'Create notebook',
      description:
        'Create a new notebook in a project. project can be id or slug.',
      inputSchema: createNotebookSchema,
    },
    async (args) => {
      const repos = await getRepos();
      const getProject = isUUID(args.project.trim())
        ? new GetProjectService(repos.project)
        : new GetProjectBySlugService(repos.project);
      let project;
      try {
        project = await getProject.execute(args.project.trim());
      } catch {
        return errorContent(`Project not found: ${args.project}`);
      }
      const useCase = new CreateNotebookService(repos.notebook);
      try {
        const notebook = await useCase.execute({
          projectId: project.id,
          title: args.title,
          description: args.description,
        });
        return jsonContent(notebook);
      } catch (error) {
        const message =
          error instanceof DomainException
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Internal server error';
        return errorContent(message);
      }
    },
  );

  const getNotebookSchema = z.object({
    id: z.string().min(1),
  });

  mcpServer.registerTool(
    'get_notebook',
    {
      title: 'Get notebook',
      description: 'Get a notebook by id or slug.',
      inputSchema: getNotebookSchema,
    },
    async (args) => {
      const repos = await getRepos();
      const useCase = isUUID(args.id.trim())
        ? new GetNotebookService(repos.notebook)
        : new GetNotebookBySlugService(repos.notebook);
      try {
        const notebook = await useCase.execute(args.id.trim());
        return jsonContent(notebook);
      } catch (error) {
        const message =
          error instanceof DomainException
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Internal server error';
        return errorContent(message);
      }
    },
  );

  const updateNotebookSchema = z.object({
    id: z.string().min(1),
    title: z.string().optional(),
    description: z.string().optional(),
    cells: z.array(z.record(z.string(), z.unknown())).optional(),
    datasources: z.array(z.string()).optional(),
  });

  mcpServer.registerTool(
    'update_notebook',
    {
      title: 'Update notebook',
      description:
        'Update a notebook by id. id can be UUID or slug. Only provided fields are updated.',
      inputSchema: updateNotebookSchema,
    },
    async (args) => {
      const repos = await getRepos();
      const getUseCase = isUUID(args.id.trim())
        ? new GetNotebookService(repos.notebook)
        : new GetNotebookBySlugService(repos.notebook);
      let existing;
      try {
        existing = await getUseCase.execute(args.id.trim());
      } catch {
        return errorContent(`Notebook not found: ${args.id}`);
      }
      const useCase = new UpdateNotebookService(repos.notebook);
      try {
        const notebook = await useCase.execute({
          id: existing.id,
          title: args.title ?? existing.title,
          description: args.description ?? existing.description,
          cells: args.cells ?? existing.cells,
          datasources: args.datasources ?? existing.datasources,
        });
        return jsonContent(notebook);
      } catch (error) {
        const message =
          error instanceof DomainException
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Internal server error';
        return errorContent(message);
      }
    },
  );

  const qweryScheme = 'qwery:';
  const notebookTemplate = new ResourceTemplate(
    `${qweryScheme}//notebook/{id}`,
    {
      list: async () => {
        const repos = await getRepos();
        const notebooks = await repos.notebook.findAll();
        return {
          resources: notebooks.map((n) => ({
            uri: `${qweryScheme}//notebook/${n.id}`,
            name: n.title ?? n.id,
            description: n.description,
            mimeType: 'application/json',
          })),
        };
      },
    },
  );

  mcpServer.registerResource(
    'notebook',
    notebookTemplate,
    {
      title: 'Notebook',
      description: 'Read-only notebook content by id (qwery://notebook/{id})',
      mimeType: 'application/json',
    },
    async (uri, variables, _extra) => {
      const raw = variables.id;
      const id = typeof raw === 'string' ? raw : (raw?.[0] ?? '');
      if (!id) throw new Error('Notebook id is required');
      const repos = await getRepos();
      const useCase = isUUID(id)
        ? new GetNotebookService(repos.notebook)
        : new GetNotebookBySlugService(repos.notebook);
      try {
        const notebook = await useCase.execute(id);
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(toSerializable(notebook), null, 2),
            },
          ],
        };
      } catch {
        throw new Error(`Notebook not found: ${id}`);
      }
    },
  );

  const datasourceTemplate = new ResourceTemplate(
    `${qweryScheme}//datasource/{id}`,
    {
      list: async () => {
        const repos = await getRepos();
        const projects = await repos.project.findAll();
        const all: { id: string; name: string; description?: string }[] = [];
        for (const p of projects) {
          const ds = await repos.datasource.findByProjectId(p.id);
          if (ds) {
            for (const d of ds) {
              all.push({
                id: d.id,
                name: d.name ?? d.id,
                description: d.description,
              });
            }
          }
        }
        return {
          resources: all.map((d) => ({
            uri: `${qweryScheme}//datasource/${d.id}`,
            name: d.name ?? d.id,
            description: d.description,
            mimeType: 'application/json',
          })),
        };
      },
    },
  );

  mcpServer.registerResource(
    'datasource',
    datasourceTemplate,
    {
      title: 'Datasource',
      description:
        'Read-only datasource metadata by id (qwery://datasource/{id})',
      mimeType: 'application/json',
    },
    async (uri, variables, _extra) => {
      const raw = variables.id;
      const id = typeof raw === 'string' ? raw : (raw?.[0] ?? '');
      if (!id) throw new Error('Datasource id is required');
      const repos = await getRepos();
      const useCase = isUUID(id)
        ? new GetDatasourceService(repos.datasource)
        : new GetDatasourceBySlugService(repos.datasource);
      try {
        const datasource = await useCase.execute(id);
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(toSerializable(datasource), null, 2),
            },
          ],
        };
      } catch {
        throw new Error(`Datasource not found: ${id}`);
      }
    },
  );

  return mcpServer;
}

function getOrCreateSession(sessionId: string | null): SessionEntry | null {
  if (sessionId) {
    return sessions.get(sessionId) ?? null;
  }
  return null;
}

async function createNewSession(): Promise<SessionEntry> {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
    allowedOrigins: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:4096',
      'http://127.0.0.1:4096',
    ],
    enableDnsRebindingProtection: true,
    onsessionclosed: (id: string) => {
      sessions.delete(id);
    },
  });
  const mcpServer = createMcpServer(getRepositories);
  await mcpServer.connect(transport);
  return { transport, mcpServer };
}

function isInitializeRequest(req: Request): Promise<boolean> {
  if (req.method !== 'POST') return Promise.resolve(false);
  return req
    .clone()
    .json()
    .then((body) => {
      const arr = Array.isArray(body) ? body : [body];
      return arr.some((m: { method?: string }) => m?.method === 'initialize');
    })
    .catch(() => false);
}

export async function handleMcpRequest(request: Request): Promise<Response> {
  const sessionId = request.headers.get('mcp-session-id');
  const existing = getOrCreateSession(sessionId ?? null);

  if (existing) {
    const parsedBody =
      request.method === 'POST'
        ? await request.json().catch(() => undefined)
        : undefined;
    return existing.transport.handleRequest(request, { parsedBody });
  }

  const isInit = await isInitializeRequest(request);
  if (isInit) {
    const entry = await createNewSession();
    const parsedBody = await request.json().catch(() => undefined);
    const response = await entry.transport.handleRequest(request, {
      parsedBody,
    });
    if (entry.transport.sessionId) {
      sessions.set(entry.transport.sessionId, entry);
    }
    return response;
  }

  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Bad Request: Server not initialized',
      },
      id: null,
    }),
    {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}
