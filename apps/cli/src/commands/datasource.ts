import type { Command } from 'commander';
import type { DatasourceOutput } from '@qwery/domain/usecases';
import type { Datasource } from '@qwery/domain/entities';
import { DatasourceKind } from '@qwery/domain/entities';

import { CliContainer } from '../container/cli-container';
import { CliUsageError } from '../utils/errors';
import { printOutput, resolveFormat } from '../utils/output';
import {
  connectionDescription,
  parseConnectionString,
} from '../utils/connection-string';
import { createIdentity } from '../utils/identity';
import {
  createDriverForDatasource,
  createDriverFromExtension,
} from '../extensions/driver-factory';

interface DatasourceListOptions {
  projectId?: string;
  format?: string;
}

interface DatasourceCreateOptions {
  connection?: string;
  config?: string;
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
    .description('Register a datasource powered by an extension provider')
    .option(
      '-c, --connection <connection>',
      'Connection string (provider-specific; optional when --config is provided)',
    )
    .option('--config <json>', 'Raw JSON configuration for the datasource')
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

      const providerId = options.provider ?? 'postgresql';
      const driverId = options.driver ?? providerId;
      const { config, summary } = resolveDatasourceConfig(providerId, options);

      if (!options.skipTest) {
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
          options.description ?? `Remote datasource ${summary.descriptionHint}`,
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

      const repositories = container.getRepositories();
      await repositories.datasource.create(datasource);

      const format = resolveFormat(options.format);
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

      const rows = datasources.map((datasource: DatasourceOutput) => ({
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
      const driver = await createDriverForDatasource(datasource);
      try {
        await driver.testConnection();
      } finally {
        driver.close();
      }
      console.log(
        `Connection to ${datasource.name} (${datasource.datasource_provider}) succeeded.`,
      );
    });
}

function parseConfigJson(raw?: string): Record<string, unknown> | null {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch (error) {
    throw new CliUsageError(
      `Unable to parse --config JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function resolveDatasourceConfig(
  providerId: string,
  options: DatasourceCreateOptions,
): {
  config: Record<string, unknown>;
  summary: { descriptionHint: string; host?: string; database?: string };
} {
  const explicitConfig = parseConfigJson(options.config);
  if (explicitConfig) {
    return {
      config: explicitConfig,
      summary: { descriptionHint: providerId },
    };
  }

  if (!options.connection) {
    throw new CliUsageError(
      'Provide either --connection or --config when creating a datasource.',
    );
  }

  if (providerId !== 'postgresql') {
    throw new CliUsageError(
      `Provider "${providerId}" requires --config JSON. Connection strings are currently supported only for PostgreSQL.`,
    );
  }

  const parsed = parseConnectionString(options.connection);
  if (parsed.protocol !== 'postgresql' && parsed.protocol !== 'postgres') {
    throw new CliUsageError(
      `Unsupported protocol "${parsed.protocol}". Expected a PostgreSQL connection string.`,
    );
  }

  return {
    config: {
      connectionUrl: options.connection,
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
