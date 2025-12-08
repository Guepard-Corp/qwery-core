import type { Command } from 'commander';
import type { NotebookOutput } from '@qwery/domain/usecases';
import type { Notebook } from '@qwery/domain/entities';
import { CliContainer } from '../container/cli-container';
import { CliUsageError } from '../utils/errors';
import { printOutput, resolveFormat } from '../utils/output';
import { createIdentity } from '../utils/identity';
import {
  withCommandSpan,
  recordQueryMetrics,
  CLI_EVENTS,
} from '../utils/telemetry-utils';

interface NotebookListOptions {
  projectId?: string;
  format?: string;
}

interface NotebookCreateOptions {
  projectId?: string;
  description?: string;
  format?: string;
}

interface NotebookAddCellOptions {
  type?: 'query' | 'prompt';
  datasources?: string;
  query?: string;
  runMode?: 'default' | 'fixit';
  format?: string;
}

interface NotebookRunOptions {
  cell?: string;
  mode?: 'sql' | 'natural';
  query?: string;
  datasource?: string;
  format?: string;
  updateCell?: boolean;
}

export function registerNotebookCommands(
  program: Command,
  container: CliContainer,
) {
  const notebook = program
    .command('notebook')
    .description('Inspect notebooks tied to a project');

  // ------------------- CREATE -------------------
  notebook
    .command('create <title>')
    .description('Create a notebook within the current project')
    .option(
      '-p, --project-id <id>',
      'Project identifier (defaults to workspace project)',
    )
    .option('-d, --description <description>', 'Notebook description')
    .option('-f, --format <format>', 'Output format: table (default) or json')
    .action(async (title: string, options: NotebookCreateOptions) => {
      await withCommandSpan(
        container.telemetry,
        container,
        'notebook.create',
        { title, ...options },
        'command',
        async (_span) => {
          container.telemetry.captureEvent({
            name: CLI_EVENTS.COMMAND_VALIDATED,
          });

          const workspace = container.getWorkspace();
          const projectId = options.projectId ?? workspace?.projectId;
          if (!projectId) {
            container.telemetry.captureEvent({
              name: CLI_EVENTS.ERROR_VALIDATION,
              attributes: {
                'error.type': 'missing_required_field',
                'error.field': 'projectId',
              },
            });
            throw new CliUsageError(
              'Project id missing. Provide --project-id or initialize the workspace.',
            );
          }

          container.telemetry.captureEvent({
            name: CLI_EVENTS.COMMAND_CREATING,
            attributes: {
              'notebook.title': title,
              'notebook.project_id': projectId,
            },
          });

          const identity = createIdentity();
          const now = new Date();
          const notebook: Notebook = {
            id: identity.id,
            projectId,
            title,
            description: options.description ?? '',
            slug: identity.slug,
            version: 1,
            createdAt: now,
            updatedAt: now,
            datasources: [],
            cells: [],
          };

          const repositories = container.getRepositories();
          await repositories.notebook.create(notebook);

          const format = resolveFormat(options.format);
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

          container.telemetry.captureEvent({
            name: CLI_EVENTS.COMMAND_CREATED,
            attributes: {
              'notebook.id': notebook.id,
              'notebook.slug': notebook.slug,
            },
          });

          return notebook;
        },
      );
    });

  // ------------------- LIST -------------------
  notebook
    .command('list')
    .description('List notebooks for the active project')
    .option(
      '-p, --project-id <id>',
      'Project identifier (defaults to workspace project)',
    )
    .option('-f, --format <format>', 'Output format: table (default) or json')
    .action(async (options: NotebookListOptions) => {
      await withCommandSpan(
        container.telemetry,
        container,
        'notebook.list',
        options as Record<string, unknown>,
        'command',
        async (_span) => {
          container.telemetry.captureEvent({
            name: CLI_EVENTS.COMMAND_VALIDATED,
          });

          const workspace = container.getWorkspace();
          const projectId = options.projectId ?? workspace?.projectId;

          if (!projectId) {
            container.telemetry.captureEvent({
              name: CLI_EVENTS.ERROR_VALIDATION,
              attributes: {
                'error.type': 'missing_required_field',
                'error.field': 'projectId',
              },
            });
            throw new CliUsageError(
              'Project id missing. Provide --project-id or initialize the workspace.',
            );
          }

          const useCases = container.getUseCases();
          const notebooks =
            await useCases.getNotebooksByProjectId.execute(projectId);

          const rows = notebooks.map((notebook: NotebookOutput) => ({
            id: notebook.id,
            title: notebook.title,
            projectId: notebook.projectId,
            datasources: notebook.datasources.length,
            version: notebook.version,
            updatedAt: notebook.updatedAt.toISOString(),
          }));

          const format = resolveFormat(options.format);
          printOutput(rows, format, 'No notebooks found.');

          container.telemetry.captureEvent({
            name: CLI_EVENTS.COMMAND_RESULT,
            attributes: {
              'cli.command.result.count': notebooks.length,
              'cli.command.result.format': format,
            },
          });

          return { count: notebooks.length };
        },
      );
    });

  // ------------------- ADD CELL -------------------
  notebook
    .command('add-cell <notebookId>')
    .description('Append a cell to a notebook')
    .option('--type <type>', 'Cell type: query or prompt', 'query')
    .option('-d, --datasources <ids>', 'Comma separated datasource identifiers')
    .option('-q, --query <text>', 'Cell text content')
    .option('--run-mode <mode>', 'Run mode: default or fixit', 'default')
    .option('-f, --format <format>', 'Output format: table (default) or json')
    .action(async (notebookId: string, options: NotebookAddCellOptions) => {
      await withCommandSpan(
        container.telemetry,
        container,
        'notebook.add-cell',
        { notebookId, ...options },
        'command',
        async (_span) => {
          container.telemetry.captureEvent({
            name: CLI_EVENTS.COMMAND_VALIDATED,
          });

          if (!options.query?.trim()) {
            container.telemetry.captureEvent({
              name: CLI_EVENTS.ERROR_VALIDATION,
              attributes: {
                'error.type': 'empty_field',
                'error.field': 'query',
              },
            });
            throw new CliUsageError('Cell query (--query) cannot be empty.');
          }

          const repositories = container.getRepositories();
          const notebook = await repositories.notebook.findById(notebookId);
          if (!notebook) {
            container.telemetry.captureEvent({
              name: CLI_EVENTS.ERROR_NOT_FOUND,
              attributes: {
                'error.type': 'resource_not_found',
                'resource.type': 'notebook',
                'resource.id': notebookId,
              },
            });
            throw new CliUsageError(
              `Notebook with id ${notebookId} not found.`,
            );
          }

          const nextCellId =
            notebook.cells.reduce(
              (max: number, cell: { cellId: number }) =>
                Math.max(max, cell.cellId),
              0,
            ) + 1;

          const datasourceIds = (options.datasources || '')
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean);
          if (datasourceIds.length === 0) {
            container.telemetry.captureEvent({
              name: CLI_EVENTS.ERROR_VALIDATION,
              attributes: {
                'error.type': 'missing_required_field',
                'error.field': 'datasources',
              },
            });
            throw new CliUsageError(
              'At least one datasource id is required (--datasources).',
            );
          }

          const cellType: 'prompt' | 'query' =
            options.type === 'prompt' ? 'prompt' : 'query';
          const runMode: 'default' | 'fixit' =
            options.runMode === 'fixit' ? 'fixit' : 'default';

          container.telemetry.captureEvent({
            name: CLI_EVENTS.COMMAND_ADDING_CELL,
            attributes: {
              'notebook.id': notebookId,
              'cell.type': cellType,
              'cell.run_mode': runMode,
            },
          });

          const cell = {
            cellId: nextCellId,
            query: options.query,
            cellType,
            datasources: datasourceIds,
            isActive: true,
            runMode,
          };

          const datasourceSet = new Set(notebook.datasources);
          datasourceIds.forEach((id) => datasourceSet.add(id));

          notebook.cells.push(cell);
          notebook.datasources = Array.from(datasourceSet);
          notebook.updatedAt = new Date();
          await repositories.notebook.update(notebook);

          const format = resolveFormat(options.format);
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

          container.telemetry.captureEvent({
            name: CLI_EVENTS.COMMAND_CELL_ADDED,
            attributes: {
              'notebook.id': notebookId,
              'cell.id': String(cell.cellId),
            },
          });

          return { notebookId, cellId: cell.cellId };
        },
      );
    });

  // ------------------- RUN -------------------
  notebook
    .command('run <notebookId>')
    .description(
      'Execute a notebook cell. Supports SQL (query) and natural language (prompt) cells.',
    )
    .option('-c, --cell <cellId>', 'Cell identifier (defaults to last cell)')
    .option(
      '--mode <mode>',
      'Execution mode: sql or natural (default auto-detect)',
    )
    .option('-q, --query <text>', 'Override cell text')
    .option(
      '-d, --datasource <id>',
      'Datasource identifier to use (overrides cell setting)',
    )
    .option(
      '--update-cell',
      'Persist generated SQL back to the cell (promotes prompt -> query)',
      false,
    )
    .option('-f, --format <format>', 'Output format: table (default) or json')
    .action(async (notebookId: string, options: NotebookRunOptions) => {
      await withCommandSpan(
        container.telemetry,
        container,
        'notebook.run',
        { notebookId, ...options },
        'command',
        async (_span) => {
          container.telemetry.captureEvent({
            name: CLI_EVENTS.COMMAND_VALIDATED,
            attributes: {
              'notebook.id': notebookId,
            },
          });

          const repositories = container.getRepositories();
          const notebook = await repositories.notebook.findById(notebookId);
          if (!notebook) {
            container.telemetry.captureEvent({
              name: CLI_EVENTS.ERROR_NOT_FOUND,
              attributes: {
                'error.type': 'resource_not_found',
                'resource.type': 'notebook',
                'resource.id': notebookId,
              },
            });
            throw new CliUsageError(
              `Notebook with id ${notebookId} not found.`,
            );
          }

          const requestedCellId = options.cell
            ? Number(options.cell)
            : undefined;
          if (options.cell && Number.isNaN(requestedCellId)) {
            container.telemetry.captureEvent({
              name: CLI_EVENTS.ERROR_VALIDATION,
              attributes: {
                'error.type': 'invalid_field',
                'error.field': 'cell',
              },
            });
            throw new CliUsageError('--cell must be a valid number.');
          }

          const cell = requestedCellId
            ? notebook.cells.find(
                (c: { cellId: number }) => c.cellId === requestedCellId,
              )
            : notebook.cells[notebook.cells.length - 1];

          if (!cell) {
            container.telemetry.captureEvent({
              name: CLI_EVENTS.ERROR_VALIDATION,
              attributes: {
                'error.type': 'no_cells',
              },
            });
            throw new CliUsageError(
              'Notebook has no cells. Use `notebook add-cell` first.',
            );
          }

          const datasourceId =
            options.datasource ?? cell.datasources?.[0] ?? undefined;
          if (!datasourceId) {
            container.telemetry.captureEvent({
              name: CLI_EVENTS.ERROR_VALIDATION,
              attributes: {
                'error.type': 'missing_required_field',
                'error.field': 'datasource',
              },
            });
            throw new CliUsageError(
              'Datasource id missing. Use --datasource or attach one to the cell.',
            );
          }

          const datasource =
            await repositories.datasource.findById(datasourceId);
          if (!datasource) {
            container.telemetry.captureEvent({
              name: CLI_EVENTS.ERROR_NOT_FOUND,
              attributes: {
                'error.type': 'resource_not_found',
                'resource.type': 'datasource',
                'resource.id': datasourceId,
              },
            });
            throw new CliUsageError(`Datasource ${datasourceId} not found.`);
          }

          const inputMode =
            options.mode ??
            (cell.cellType === 'prompt' ? 'natural' : ('sql' as const));

          const queryText = options.query ?? cell.query;
          if (!queryText?.trim()) {
            container.telemetry.captureEvent({
              name: CLI_EVENTS.ERROR_VALIDATION,
              attributes: {
                'error.type': 'empty_field',
                'error.field': 'query',
              },
            });
            throw new CliUsageError('Cell query content is empty.');
          }

          container.telemetry.captureEvent({
            name: CLI_EVENTS.COMMAND_EXECUTING,
            attributes: {
              'notebook.id': notebookId,
              'cell.id': String(cell.cellId),
              'query.mode': inputMode,
              'datasource.id': datasourceId,
            },
          });

          const startTime = Date.now();
          const runner = container.getNotebookRunner();
          const result = await runner.runCell({
            datasource,
            query: queryText,
            mode: inputMode === 'natural' ? 'natural' : 'sql',
          });
          const duration = Date.now() - startTime;

          // Record query metrics
          recordQueryMetrics(
            container.telemetry,
            container,
            duration,
            result.rowCount,
            {
              'query.mode': inputMode,
              'datasource.id': datasourceId,
              'notebook.id': notebookId,
            },
          );

          if (options.updateCell && result.sql) {
            container.telemetry.captureEvent({
              name: CLI_EVENTS.COMMAND_UPDATING_CELL,
            });
            cell.query = result.sql;
            cell.cellType = 'query';
            if (!cell.datasources.includes(datasourceId)) {
              cell.datasources.push(datasourceId);
            }
            notebook.updatedAt = new Date();
            await repositories.notebook.update(notebook);
          }

          const format = resolveFormat(options.format);
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

          container.telemetry.captureEvent({
            name: CLI_EVENTS.COMMAND_EXECUTED,
            attributes: {
              'notebook.id': notebookId,
              'cell.id': String(cell.cellId),
              'query.duration_ms': String(duration),
              'query.row_count': String(result.rowCount),
            },
          });

          return { notebookId, cellId: cell.cellId, rowCount: result.rowCount };
        },
      );
    });
}
