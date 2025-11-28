import type { CliContainer } from '../container/cli-container';
import { CliUsageError } from '../utils/errors';
import { printOutput, resolveFormat } from '../utils/output';
import { successBox } from '../utils/formatting';
import { v4 as uuidv4 } from 'uuid';
import type { Workspace } from '@qwery/domain/entities';
import { WorkspaceModeEnum, WorkspaceRuntimeEnum } from '@qwery/domain/enums';
import type { Datasource } from '@qwery/domain/entities';
import { DatasourceKind } from '@qwery/domain/entities';
import {
  connectionDescription,
  parseConnectionString,
} from '../utils/connection-string';
import { createIdentity } from '../utils/identity';
import {
  createDriverForDatasource,
  createDriverFromExtension,
} from '../extensions/driver-factory';

export class InteractiveCommandRouter {
  constructor(private readonly container: CliContainer) {}

  public async execute(command: string, args: string[]): Promise<void> {
    const cmd = command.trim();
    if (!cmd) {
      throw new CliUsageError(
        'Missing command. Type /help for available commands.',
      );
    }
    const rest = args;

    switch (cmd) {
      case 'workspace':
        await this.handleWorkspace(rest);
        break;
      case 'datasource':
        await this.handleDatasource(rest);
        break;
      case 'notebook':
        await this.handleNotebook(rest);
        break;
      case 'project':
        await this.handleProject(rest);
        break;
      default:
        throw new CliUsageError(
          `Unknown command: ${cmd}. Type /help for available commands.`,
        );
    }
  }

  private async handleWorkspace(args: string[]): Promise<void> {
    const [subcmd, ...rest] = args;

    switch (subcmd) {
      case 'init': {
        const options = this.parseOptions(rest);
        const useCases = this.container.getUseCases();
        const previous = this.container.getWorkspace();

        const userId =
          options['user-id'] ?? options['u'] ?? previous?.userId ?? '';
        const organizationId =
          options['organization-id'] ??
          options['o'] ??
          previous?.organizationId;
        const projectId =
          options['project-id'] ?? options['p'] ?? previous?.projectId;

        const workspaceDto = await useCases.initWorkspace.execute({
          userId,
          organizationId,
          projectId,
        });

        const state: Workspace = {
          id: uuidv4(),
          userId: workspaceDto.user.id,
          username: workspaceDto.user.username,
          organizationId: workspaceDto.organization?.id,
          projectId: workspaceDto.project?.id,
          isAnonymous: workspaceDto.isAnonymous,
          mode: WorkspaceModeEnum.SIMPLE,
          runtime: WorkspaceRuntimeEnum.DESKTOP,
        };

        this.container.setWorkspace(state);

        const format = resolveFormat(options['format'] ?? options['f']);
        const summary = {
          workspaceId: state.id,
          userId: state.userId,
          username: state.username,
          organizationId: state.organizationId ?? '(none)',
          projectId: state.projectId ?? '(none)',
          mode: state.mode,
          isAnonymous: state.isAnonymous,
          stateFile: this.container.getStateFilePath(),
        };

        printOutput(summary, format, 'Workspace not initialized yet.');
        break;
      }
      case 'show': {
        const options = this.parseOptions(rest);
        const state = this.container.getWorkspace();
        if (!state) {
          throw new CliUsageError(
            'Workspace not initialized. Run `workspace init` first.',
          );
        }

        const format = resolveFormat(options['format'] ?? options['f']);
        const summary = {
          workspaceId: state.id,
          userId: state.userId,
          username: state.username,
          organizationId: state.organizationId ?? '(none)',
          projectId: state.projectId ?? '(none)',
          mode: state.mode,
          isAnonymous: state.isAnonymous,
          stateFile: this.container.getStateFilePath(),
        };
        printOutput(summary, format);
        break;
      }
      default:
        throw new CliUsageError(
          `Unknown workspace command: ${subcmd}. Use 'init' or 'show'.`,
        );
    }
  }

  private async handleDatasource(args: string[]): Promise<void> {
    const [subcmd, ...rest] = args;

    switch (subcmd) {
      case 'create': {
        const name = rest[0];
        if (!name) {
          throw new CliUsageError(
            'Datasource name required: datasource create <name>',
          );
        }

        const options = this.parseOptions(rest.slice(1));
        const workspace = this.container.getWorkspace();
        const projectId =
          options['project-id'] ?? options['p'] ?? workspace?.projectId;
        if (!projectId) {
          throw new CliUsageError(
            'Project id missing. Provide --project-id or initialize the workspace.',
          );
        }

        const providerId = options['provider'] ?? 'postgresql';
        const driverId = options['driver'] ?? providerId;
        const { config, summary } = this.resolveDatasourceConfig(
          providerId,
          options,
        );

        if (!options['skip-test']) {
          const driver = await createDriverFromExtension(
            providerId,
            name,
            config,
          );
          try {
            await driver.testConnection();
          } finally {
            driver.close();
          }
        }

        const identity = createIdentity();
        const now = new Date();

        const datasource: Datasource = {
          id: identity.id,
          projectId,
          name,
          description:
            options['description'] ??
            options['d'] ??
            `Remote datasource ${summary.descriptionHint}`,
          datasource_provider: providerId,
          datasource_driver: driverId,
          datasource_kind: DatasourceKind.REMOTE,
          slug: identity.slug,
          config,
          createdAt: now,
          updatedAt: now,
          createdBy: workspace?.userId ?? 'cli',
          updatedBy: workspace?.userId ?? 'cli',
        };

        const repositories = this.container.getRepositories();
        await repositories.datasource.create(datasource);

        const format = resolveFormat(options['format'] ?? options['f']);
        printOutput(
          {
            id: datasource.id,
            name: datasource.name,
            provider: datasource.datasource_provider,
            driver: datasource.datasource_driver,
            host: summary.host ?? '(n/a)',
            database: summary.database ?? '(n/a)',
          },
          format,
          'Datasource created.',
        );
        break;
      }
      case 'list': {
        const options = this.parseOptions(rest);
        const workspace = this.container.getWorkspace();
        const projectId =
          options['project-id'] ?? options['p'] ?? workspace?.projectId;

        if (!projectId) {
          throw new CliUsageError(
            'Project id missing. Provide --project-id or initialize the workspace.',
          );
        }

        const useCases = this.container.getUseCases();
        const datasources =
          await useCases.getDatasourcesByProjectId.execute(projectId);

        const format = resolveFormat(options['format'] ?? options['f']);
        const rows = datasources.map((datasource) => ({
          id: datasource.id,
          name: datasource.name,
          projectId: datasource.projectId,
          provider: datasource.datasource_provider,
          driver: datasource.datasource_driver,
          kind: datasource.datasource_kind,
          updatedAt: datasource.updatedAt.toISOString(),
        }));

        printOutput(rows, format, 'No datasources found.');
        break;
      }
      case 'test': {
        const datasourceId = rest[0];
        if (!datasourceId) {
          throw new CliUsageError(
            'Datasource id required: datasource test <datasource-id>',
          );
        }

        const repositories = this.container.getRepositories();
        const datasource = await repositories.datasource.findById(datasourceId);
        if (!datasource) {
          throw new CliUsageError(
            `Datasource with id ${datasourceId} not found`,
          );
        }

        const driver = await createDriverForDatasource(datasource);
        try {
          await driver.testConnection();
          console.log(
            '\n' +
              successBox(
                `Connection to ${datasource.name} (${datasource.datasource_provider}) succeeded.`,
              ) +
              '\n',
          );
        } finally {
          driver.close();
        }
        break;
      }
      default:
        throw new CliUsageError(
          `Unknown datasource command: ${subcmd}. Use 'create', 'list', or 'test'.`,
        );
    }
  }

  private async handleNotebook(args: string[]): Promise<void> {
    const [subcmd, ...rest] = args;

    switch (subcmd) {
      case 'create': {
        const title = rest[0];
        if (!title) {
          throw new CliUsageError(
            'Notebook title required: notebook create <title>',
          );
        }

        const options = this.parseOptions(rest.slice(1));
        const workspace = this.container.getWorkspace();
        const projectId =
          options['project-id'] ?? options['p'] ?? workspace?.projectId;
        if (!projectId) {
          throw new CliUsageError(
            'Project id missing. Provide --project-id or initialize the workspace.',
          );
        }

        const identity = createIdentity();
        const now = new Date();
        const notebook = {
          id: identity.id,
          projectId,
          title,
          description: options['description'] ?? options['d'] ?? '',
          slug: identity.slug,
          version: 1,
          createdAt: now,
          updatedAt: now,
          datasources: [],
          cells: [],
        };

        const repositories = this.container.getRepositories();
        await repositories.notebook.create(notebook);

        const format = resolveFormat(options['format'] ?? options['f']);
        printOutput(
          {
            id: notebook.id,
            title: notebook.title,
            projectId: notebook.projectId,
            slug: notebook.slug,
          },
          format,
          'Notebook created.',
        );
        break;
      }
      case 'list': {
        const options = this.parseOptions(rest);
        const workspace = this.container.getWorkspace();
        const projectId =
          options['project-id'] ?? options['p'] ?? workspace?.projectId;

        if (!projectId) {
          throw new CliUsageError(
            'Project id missing. Provide --project-id or initialize the workspace.',
          );
        }

        const useCases = this.container.getUseCases();
        const notebooks =
          await useCases.getNotebooksByProjectId.execute(projectId);

        const format = resolveFormat(options['format'] ?? options['f']);
        const rows = notebooks.map((notebook) => ({
          id: notebook.id,
          title: notebook.title,
          projectId: notebook.projectId,
          datasources: notebook.datasources.length,
          version: notebook.version,
          updatedAt: notebook.updatedAt.toISOString(),
        }));

        printOutput(rows, format, 'No notebooks found.');
        break;
      }
      case 'add-cell': {
        const notebookId = rest[0];
        if (!notebookId) {
          throw new CliUsageError(
            'Notebook id required: notebook add-cell <notebook-id>',
          );
        }

        const options = this.parseOptions(rest.slice(1));
        const query = options['query'] ?? options['q'];
        if (!query?.trim()) {
          throw new CliUsageError('Cell query (--query) cannot be empty.');
        }

        const repositories = this.container.getRepositories();
        const notebook = await repositories.notebook.findById(notebookId);
        if (!notebook) {
          throw new CliUsageError(`Notebook with id ${notebookId} not found.`);
        }

        const nextCellId =
          notebook.cells.reduce(
            (max: number, cell: { cellId: number }) =>
              Math.max(max, cell.cellId),
            0,
          ) + 1;

        const datasourceIds = ((options['datasources'] ?? options['d']) || '')
          .split(',')
          .map((id: string) => id.trim())
          .filter(Boolean);
        if (datasourceIds.length === 0) {
          throw new CliUsageError(
            'At least one datasource id is required (--datasources).',
          );
        }

        const cellType: 'prompt' | 'query' =
          options['type'] === 'prompt' ? 'prompt' : 'query';
        const runMode: 'default' | 'fixit' =
          options['run-mode'] === 'fixit' ? 'fixit' : 'default';

        const cell = {
          cellId: nextCellId,
          query,
          cellType,
          datasources: datasourceIds,
          isActive: true,
          runMode,
        };

        const datasourceSet = new Set(notebook.datasources);
        datasourceIds.forEach((id: string) => datasourceSet.add(id));

        notebook.cells.push(cell);
        notebook.datasources = Array.from(datasourceSet);
        notebook.updatedAt = new Date();
        await repositories.notebook.update(notebook);

        const format = resolveFormat(options['format'] ?? options['f']);
        printOutput(
          {
            notebookId: notebook.id,
            cellId: cell.cellId,
            type: cell.cellType,
            datasources: cell.datasources.join(', '),
          },
          format,
          'Cell added.',
        );
        break;
      }
      case 'run': {
        const notebookId = rest[0];
        if (!notebookId) {
          throw new CliUsageError(
            'Notebook id required: notebook run <notebook-id>',
          );
        }

        const options = this.parseOptions(rest.slice(1));
        const repositories = this.container.getRepositories();
        const notebook = await repositories.notebook.findById(notebookId);
        if (!notebook) {
          throw new CliUsageError(`Notebook with id ${notebookId} not found.`);
        }

        const requestedCellId =
          (options['cell'] ?? options['c'])
            ? Number(options['cell'] ?? options['c'])
            : undefined;
        if (options['cell'] && Number.isNaN(requestedCellId)) {
          throw new CliUsageError('--cell must be a valid number.');
        }

        const cell = requestedCellId
          ? notebook.cells.find(
              (c: { cellId: number }) => c.cellId === requestedCellId,
            )
          : notebook.cells[notebook.cells.length - 1];

        if (!cell) {
          throw new CliUsageError(
            'Notebook has no cells. Use `notebook add-cell` first.',
          );
        }

        const datasourceId =
          options['datasource'] ??
          options['d'] ??
          cell.datasources?.[0] ??
          undefined;
        if (!datasourceId) {
          throw new CliUsageError(
            'Datasource id missing. Use --datasource or attach one to the cell.',
          );
        }

        const datasource = await repositories.datasource.findById(datasourceId);
        if (!datasource) {
          throw new CliUsageError(`Datasource ${datasourceId} not found.`);
        }

        const inputMode =
          options['mode'] ??
          (cell.cellType === 'prompt' ? 'natural' : ('sql' as const));
        const queryText = options['query'] ?? options['q'] ?? cell.query;
        if (!queryText?.trim()) {
          throw new CliUsageError('Cell query content is empty.');
        }

        const runner = this.container.getNotebookRunner();
        const result = await runner.runCell({
          datasource,
          query: queryText,
          mode: inputMode === 'natural' ? 'natural' : 'sql',
        });

        if (options['update-cell'] && result.sql) {
          cell.query = result.sql;
          cell.cellType = 'query';
          if (!cell.datasources.includes(datasourceId)) {
            cell.datasources.push(datasourceId);
          }
          notebook.updatedAt = new Date();
          await repositories.notebook.update(notebook);
        }

        const format = resolveFormat(options['format'] ?? options['f']);
        printOutput(
          {
            notebookId: notebook.id,
            cellId: cell.cellId,
            datasourceId,
            sql: result.sql,
            rows: result.rows,
            rowCount: result.rowCount,
          },
          format,
          'Query executed.',
        );
        break;
      }
      default:
        throw new CliUsageError(
          `Unknown notebook command: ${subcmd}. Use 'create', 'list', 'add-cell', or 'run'.`,
        );
    }
  }

  private async handleProject(args: string[]): Promise<void> {
    const [subcmd, ...rest] = args;

    switch (subcmd) {
      case 'list': {
        const options = this.parseOptions(rest);
        const useCases = this.container.getUseCases();
        const projects = await useCases.getProjects.execute();

        const filtered =
          (options['organization-id'] ?? options['o'])
            ? projects.filter(
                (project) =>
                  project.org_id ===
                  (options['organization-id'] ?? options['o']),
              )
            : projects;

        const format = resolveFormat(options['format'] ?? options['f']);
        const rows = filtered.map((project) => ({
          id: project.id,
          name: project.name,
          organization: project.org_id,
          status: project.status,
          createdBy: project.createdBy,
          updatedAt: project.updatedAt.toISOString(),
        }));

        printOutput(rows, format, 'No projects found.');
        break;
      }
      case 'create': {
        const name = rest[0];
        if (!name) {
          throw new CliUsageError(
            'Project name required: project create <name>',
          );
        }

        const options = this.parseOptions(rest.slice(1));
        const workspace = this.container.getWorkspace();
        const organizationId =
          options['organization-id'] ??
          options['o'] ??
          workspace?.organizationId;

        if (!organizationId) {
          throw new CliUsageError(
            'Organization id missing. Provide --organization-id or initialize the workspace.',
          );
        }

        const description = options['description'] ?? options['d']?.trim();
        if (!description) {
          throw new CliUsageError('Project description cannot be empty.');
        }

        const creator =
          options['created-by'] ??
          workspace?.username ??
          workspace?.userId ??
          'cli';

        const payload = {
          org_id: organizationId,
          name,
          description,
          status: options['status'] ?? options['s'] ?? 'active',
          createdBy: creator,
        };

        const useCases = this.container.getUseCases();
        await useCases.getOrganization.execute(organizationId);
        const projectDto = await useCases.createProject.execute(payload);

        const format = resolveFormat(options['format'] ?? options['f']);
        const summary = {
          id: projectDto.id,
          name: projectDto.name,
          organizationId: projectDto.org_id,
          description: projectDto.description,
          status: projectDto.status,
          slug: projectDto.slug,
          createdBy: projectDto.createdBy,
          updatedBy: projectDto.updatedBy,
          createdAt: projectDto.createdAt.toISOString(),
          updatedAt: projectDto.updatedAt.toISOString(),
        };
        printOutput(summary, format);
        break;
      }
      case 'delete': {
        const projectId = rest[0];
        if (!projectId) {
          throw new CliUsageError(
            'Project id required: project delete <project-id>',
          );
        }

        const options = this.parseOptions(rest.slice(1));
        if (!options['force'] && !options['f']) {
          throw new CliUsageError('Use --force to confirm deletion.');
        }

        const useCases = this.container.getUseCases();
        await useCases.deleteProject.execute(projectId);
        console.log(
          '\n' + successBox(`Project '${projectId}' deleted.`) + '\n',
        );
        break;
      }
      default:
        throw new CliUsageError(
          `Unknown project command: ${subcmd}. Use 'list', 'create', or 'delete'.`,
        );
    }
  }

  private parseOptions(args: string[]): Record<string, string> {
    const options: Record<string, string> = {};
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (!arg) {
        continue;
      }
      if (arg.startsWith('--')) {
        const key = arg.slice(2);
        const next = args[i + 1];
        if (next && !next.startsWith('-')) {
          options[key] = next;
          i++;
        } else {
          options[key] = 'true';
        }
      } else if (arg.startsWith('-') && arg.length === 2) {
        const key = arg.slice(1);
        const next = args[i + 1];
        if (next && !next.startsWith('-')) {
          options[key] = next;
          i++;
        } else {
          options[key] = 'true';
        }
      }
    }
    return options;
  }

  private resolveDatasourceConfig(
    providerId: string,
    options: Record<string, string>,
  ): {
    config: Record<string, unknown>;
    summary: { descriptionHint: string; host?: string; database?: string };
  } {
    const explicitConfig = options['config']
      ? JSON.parse(options['config'])
      : null;
    if (explicitConfig) {
      return {
        config: explicitConfig,
        summary: { descriptionHint: providerId },
      };
    }

    const connection = options['connection'] ?? options['c'];
    if (!connection) {
      throw new CliUsageError(
        'Provide either --connection or --config when creating a datasource.',
      );
    }

    if (providerId !== 'postgresql') {
      throw new CliUsageError(
        `Provider "${providerId}" requires --config JSON. Connection strings are currently supported only for PostgreSQL.`,
      );
    }

    const parsed = parseConnectionString(connection);
    if (parsed.protocol !== 'postgresql' && parsed.protocol !== 'postgres') {
      throw new CliUsageError(
        `Unsupported protocol "${parsed.protocol}". Expected a PostgreSQL connection string.`,
      );
    }

    return {
      config: {
        connectionUrl: connection,
        host: parsed.host,
        port: parsed.port,
        database: parsed.database,
        sslmode: parsed.searchParams.get('sslmode'),
        username: parsed.username,
      },
      summary: {
        descriptionHint: connectionDescription(parsed),
        host: parsed.host,
        database: parsed.database,
      },
    };
  }
}
