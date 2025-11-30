import type { Command } from 'commander';
import type { NotebookOutput } from '@qwery/domain/usecases';
import type { Notebook } from '@qwery/domain/entities';
import { CliContainer } from '../container/cli-container';
import { CliUsageError } from '../utils/errors';
import { printOutput, resolveFormat } from '../utils/output';
import { createIdentity } from '../utils/identity';

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
      const workspace = container.getWorkspace();
      const projectId = options.projectId ?? workspace?.projectId;
      if (!projectId) {
        throw new CliUsageError(
          'Project id missing. Provide --project-id or initialize the workspace.',
        );
      }

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
    });

  notebook
    .command('list')
    .description('List notebooks for the active project')
    .option(
      '-p, --project-id <id>',
      'Project identifier (defaults to workspace project)',
    )
    .option('-f, --format <format>', 'Output format: table (default) or json')
    .action(async (options: NotebookListOptions) => {
      const workspace = container.getWorkspace();
      const projectId = options.projectId ?? workspace?.projectId;

      if (!projectId) {
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
    });

  notebook
    .command('add-cell <notebookId>')
    .description('Append a cell to a notebook')
    .option('--type <type>', 'Cell type: query or prompt', 'query')
    .option('-d, --datasources <ids>', 'Comma separated datasource identifiers')
    .option('-q, --query <text>', 'Cell text content')
    .option('--run-mode <mode>', 'Run mode: default or fixit', 'default')
    .option('-f, --format <format>', 'Output format: table (default) or json')
    .action(async (notebookId: string, options: NotebookAddCellOptions) => {
      if (!options.query?.trim()) {
        throw new CliUsageError('Cell query (--query) cannot be empty.');
      }

      const repositories = container.getRepositories();
      const notebook = await repositories.notebook.findById(notebookId);
      if (!notebook) {
        throw new CliUsageError(`Notebook with id ${notebookId} not found.`);
      }

      const nextCellId =
        notebook.cells.reduce(
          (max: number, cell: { cellId: number }) => Math.max(max, cell.cellId),
          0,
        ) + 1;

      const datasourceIds = (options.datasources || '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      if (datasourceIds.length === 0) {
        throw new CliUsageError(
          'At least one datasource id is required (--datasources).',
        );
      }

      const cellType: 'prompt' | 'query' =
        options.type === 'prompt' ? 'prompt' : 'query';
      const runMode: 'default' | 'fixit' =
        options.runMode === 'fixit' ? 'fixit' : 'default';

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
    });

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
      const repositories = container.getRepositories();
      const notebook = await repositories.notebook.findById(notebookId);
      if (!notebook) {
        throw new CliUsageError(`Notebook with id ${notebookId} not found.`);
      }

      const requestedCellId = options.cell ? Number(options.cell) : undefined;
      if (options.cell && Number.isNaN(requestedCellId)) {
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
        options.datasource ?? cell.datasources?.[0] ?? undefined;
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
        options.mode ??
        (cell.cellType === 'prompt' ? 'natural' : ('sql' as const));

      const queryText = options.query ?? cell.query;
      if (!queryText?.trim()) {
        throw new CliUsageError('Cell query content is empty.');
      }

      const runner = container.getNotebookRunner();
      const result = await runner.runCell({
        datasource,
        query: queryText,
        mode: inputMode === 'natural' ? 'natural' : 'sql',
      });

      if (options.updateCell && result.sql) {
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
    });
}
