/**
 * EXAMPLE: Fully Instrumented Command
 *
 * This file demonstrates how to instrument CLI commands with OpenTelemetry
 * using the telemetry utilities. Copy this pattern to other commands.
 */

import type { Command } from 'commander';
import type { CliContainer } from '../container/cli-container';
import type { TelemetryManager } from '@qwery/telemetry-opentelemetry';
import { withCommandSpan, CLI_EVENTS } from '../utils/telemetry-utils';
import { printOutput, resolveFormat } from '../utils/output';

interface ProjectListOptions {
  organizationId?: string;
  format?: string;
}

export function registerProjectListCommand(
  program: Command,
  container: CliContainer,
) {
  program
    .command('project list')
    .description('List available projects')
    .option('-o, --organization-id <id>', 'Filter by organization identifier')
    .option('-f, --format <format>', 'Output format: table (default) or json')
    .action(async (options: ProjectListOptions) => {
      const telemetry = container.telemetry;

      // Wrap command execution with telemetry
      await withCommandSpan(
        telemetry,
        container,
        'project.list',
        options as Record<string, unknown>,
        'command', // or 'interactive' if in REPL mode
        async (_span) => {
          // Record milestone: command validated
          telemetry.captureEvent({
            name: CLI_EVENTS.COMMAND_VALIDATED,
            attributes: {
              'cli.command.args': JSON.stringify(options),
            },
          });

          const useCases = container.getUseCases();

          // Record milestone: starting execution
          telemetry.captureEvent({
            name: CLI_EVENTS.COMMAND_EXECUTING,
          });

          const projects = await useCases.getProjects.execute();

          const filtered = options.organizationId
            ? projects.filter(
                (project) => project.org_id === options.organizationId,
              )
            : projects;

          const format = resolveFormat(options.format);
          const rows = filtered.map((project) => ({
            id: project.id,
            name: project.name,
            organization: project.org_id,
            status: project.status,
            createdBy: project.createdBy,
            updatedAt: project.updatedAt.toISOString(),
          }));

          printOutput(rows, format, 'No projects found.');

          // Record result metrics
          telemetry.captureEvent({
            name: CLI_EVENTS.COMMAND_RESULT,
            attributes: {
              'cli.command.result.count': filtered.length,
              'cli.command.result.format': format,
            },
          });

          return { count: filtered.length, format };
        },
      );
    });
}

/**
 * EXAMPLE: Command with Error Handling
 */
export function registerProjectCreateCommand(
  program: Command,
  container: CliContainer,
) {
  program
    .command('project create <name>')
    .description('Create a new project')
    .requiredOption('-d, --description <description>', 'Project description')
    .option('-o, --organization-id <id>', 'Organization identifier')
    .action(async (name: string, options: Record<string, unknown>) => {
      const telemetry = container.telemetry;

      await withCommandSpan(
        telemetry,
        container,
        'project.create',
        { name, ...options },
        'command',
        async (_span) => {
          // Validation milestone
          telemetry.captureEvent({
            name: CLI_EVENTS.COMMAND_VALIDATED,
          });

          const workspace = container.getWorkspace();
          const organizationId =
            options.organizationId ?? workspace?.organizationId;

          if (!organizationId) {
            // Record validation error
            telemetry.captureEvent({
              name: CLI_EVENTS.ERROR_VALIDATION,
              attributes: {
                'error.type': 'missing_required_field',
                'error.field': 'organizationId',
              },
            });
            throw new Error('Organization id missing');
          }

          // Record milestone: creating project
          telemetry.captureEvent({
            name: CLI_EVENTS.COMMAND_CREATING,
            attributes: {
              'cli.project.name': name,
              'cli.project.organization_id': organizationId,
            },
          });

          const useCases = container.getUseCases();
          const project = await useCases.createProject.execute({
            org_id: organizationId as string, // TypeScript doesn't narrow after throw, but we know it's string here
            name,
            description: options.description as string | undefined,
            createdBy: workspace?.userId ?? 'cli',
          });

          // Record success with project details
          telemetry.captureEvent({
            name: CLI_EVENTS.COMMAND_CREATED,
            attributes: {
              'cli.project.id': project.id,
              'cli.project.slug': project.slug,
            },
          });

          return project;
        },
      );
    });
}

/**
 * EXAMPLE: Recording Token Usage
 */
export async function recordAgentTokenUsage(
  telemetry: TelemetryManager,
  container: CliContainer,
  promptTokens: number,
  completionTokens: number,
  model?: string,
) {
  const { recordTokenUsage } = await import('../utils/telemetry-utils');

  recordTokenUsage(telemetry, container, promptTokens, completionTokens, {
    'ai.model': model || 'unknown',
  });
}

/**
 * EXAMPLE: Recording Query Metrics
 */
export async function recordQueryExecution(
  telemetry: TelemetryManager,
  container: CliContainer,
  query: string,
  durationMs: number,
  rowCount: number,
) {
  const { recordQueryMetrics } = await import('../utils/telemetry-utils');

  recordQueryMetrics(telemetry, container, durationMs, rowCount, {
    'query.type': 'sql',
    'query.length': String(query.length),
  });
}
