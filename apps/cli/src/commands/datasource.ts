import type { Command } from 'commander';
import type { DatasourceUseCaseDto } from '@qwery/domain/usecases';
import type { Datasource } from '@qwery/domain/entities';
import { DatasourceKind } from '@qwery/domain/entities';

import { CliContainer } from '../container/cli-container';
import { CliUsageError } from '../utils/errors';
import { printOutput, resolveFormat } from '../utils/output';
import {
  connectionDescription,
  parseConnectionString,
} from '../utils/connection-string';
import { testPostgresConnection } from '../utils/postgres';
import { createIdentity } from '../utils/identity';

interface DatasourceListOptions {
  projectId?: string;
  format?: string;
}

interface DatasourceCreateOptions {
  connection: string;
  description?: string;
  provider?: string;
  driver?: string;
  projectId?: string;
  skipTest?: boolean;
  format?: string;
}

interface DatasourceTestOptions {
  datasourceId?: string;
}

export function registerDatasourceCommands(
  program: Command,
  container: CliContainer,
) {
  const datasource = program
    .command('datasource')
    .description('Inspect datasources via domain use cases');

  datasource
    .command('create <name>')
    .description('Register a datasource backed by a Postgres connection string')
    .requiredOption(
      '-c, --connection <connection>',
      'Connection string (e.g. postgresql://user:pass@host:port/db?sslmode=require)',
    )
    .option('-d, --description <description>', 'Datasource description')
    .option('--provider <provider>', 'Datasource provider id', 'postgresql')
    .option('--driver <driver>', 'Datasource driver id', 'postgresql')
    .option(
      '-p, --project-id <id>',
      'Project identifier (defaults to workspace project)',
    )
    .option('--skip-test', 'Skip live connection test', false)
    .option('-f, --format <format>', 'Output format: table (default) or json')
    .action(async (name: string, options: DatasourceCreateOptions) => {
      const workspace = container.getWorkspace();
      const projectId = options.projectId ?? workspace?.projectId;
      if (!projectId) {
        throw new CliUsageError(
          'Project id missing. Provide --project-id or initialize the workspace.',
        );
      }

      const parsed = parseConnectionString(options.connection);
      if (parsed.protocol !== 'postgresql' && parsed.protocol !== 'postgres') {
        throw new CliUsageError(
          `Unsupported protocol "${parsed.protocol}". Only PostgreSQL URLs are supported for now.`,
        );
      }

      if (!options.skipTest) {
        await testPostgresConnection(options.connection);
      }

      const identity = createIdentity();
      const now = new Date();

      const datasource: Datasource = {
        id: identity.id,
        projectId,
        name,
        description:
          options.description ?? `Remote datasource ${connectionDescription(parsed)}`,
        datasource_provider: options.provider ?? 'postgresql',
        datasource_driver: options.driver ?? 'postgresql',
        datasource_kind: DatasourceKind.REMOTE,
        slug: identity.slug,
        config: {
          connectionUrl: options.connection,
          host: parsed.host,
          port: parsed.port,
          database: parsed.database,
          sslmode: parsed.searchParams.get('sslmode'),
          username: parsed.username,
        },
        createdAt: now,
        updatedAt: now,
        createdBy: workspace?.userId ?? 'cli',
        updatedBy: workspace?.userId ?? 'cli',
      };

      const repositories = container.getRepositories();
      await repositories.datasource.create(datasource);

      const format = resolveFormat(options.format);
      printOutput(
        {
          id: datasource.id,
          name: datasource.name,
          provider: datasource.datasource_provider,
          driver: datasource.datasource_driver,
          host: parsed.host,
          database: parsed.database,
        },
        format,
        'Datasource created.',
      );
    });

  datasource
    .command('list')
    .description('List datasources for the active project')
    .option(
      '-p, --project-id <id>',
      'Project identifier (defaults to workspace project)',
    )
    .option('-f, --format <format>', 'Output format: table (default) or json')
    .action(async (options: DatasourceListOptions) => {
      const workspace = container.getWorkspace();
      const projectId = options.projectId ?? workspace?.projectId;

      if (!projectId) {
        throw new CliUsageError(
          'Project id missing. Provide --project-id or initialize the workspace.',
        );
      }

      const useCases = container.getUseCases();
      const datasources =
        await useCases.getDatasourcesByProjectId.execute(projectId);

      const rows = datasources.map((datasource: DatasourceUseCaseDto) => ({
        id: datasource.id,
        name: datasource.name,
        projectId: datasource.projectId,
        provider: datasource.datasource_provider,
        driver: datasource.datasource_driver,
        kind: datasource.datasource_kind,
        updatedAt: datasource.updatedAt.toISOString(),
      }));

      const format = resolveFormat(options.format);
      printOutput(rows, format, 'No datasources found.');
    });

  datasource
    .command('test <datasourceId>')
    .description('Test connectivity for a stored datasource')
    .action(async (datasourceId: string, _options: DatasourceTestOptions) => {
      const repositories = container.getRepositories();
      const datasource = await repositories.datasource.findById(datasourceId);
      if (!datasource) {
        throw new CliUsageError(`Datasource with id ${datasourceId} not found`);
      }
      const connectionUrl = datasource.config?.connectionUrl;
      if (typeof connectionUrl !== 'string' || connectionUrl.length === 0) {
        throw new CliUsageError(
          `Datasource ${datasource.id} is missing a connectionUrl.`,
        );
      }
      await testPostgresConnection(connectionUrl);
      console.log(
        `Connection to ${datasource.name} (${datasource.datasource_provider}) succeeded.`,
      );
    });
}

