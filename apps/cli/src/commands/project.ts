import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';

import type { Command } from 'commander';
import type { ProjectOutput } from '@qwery/domain/usecases';

import { CliContainer } from '../container/cli-container';
import { CliUsageError } from '../utils/errors';
import { printOutput, resolveFormat } from '../utils/output';
import { withCommandSpan, CLI_EVENTS } from '../utils/telemetry-utils';

interface ProjectListOptions {
  organizationId?: string;
  format?: string;
}

interface ProjectCreateOptions {
  organizationId?: string;
  description?: string;
  status?: string;
  createdBy?: string;
  format?: string;
}

type CreateProjectPayload = {
  org_id: string;
  name: string;
  description: string;
  status: string;
  createdBy: string;
};

interface ProjectDeleteOptions {
  force?: boolean;
}

export function registerProjectCommands(
  program: Command,
  container: CliContainer,
) {
  const project = program
    .command('project')
    .description('Manage Qwery projects through domain use cases');

  // ------------------- LIST -------------------
  project
    .command('list')
    .description('List available projects')
    .option('-o, --organization-id <id>', 'Filter by organization identifier')
    .option('-f, --format <format>', 'Output format: table (default) or json')
    .action(async (options: ProjectListOptions) => {
      await withCommandSpan(
        container.telemetry,
        container,
        'project.list',
        options as Record<string, unknown>,
        'command',
        async (_span) => {
          // Record validation milestone
          container.telemetry.captureEvent({
            name: CLI_EVENTS.COMMAND_VALIDATED,
            attributes: {
              'cli.command.args': JSON.stringify(options),
            },
          });

          const useCases = container.getUseCases();
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
          container.telemetry.captureEvent({
            name: CLI_EVENTS.COMMAND_RESULT,
            attributes: {
              'cli.command.result.count': filtered.length,
              'cli.command.result.format': format,
            },
          });

          return { count: filtered.length };
        },
      );
    });

  // ------------------- CREATE -------------------
  project
    .command('create <name>')
    .description('Create a new project')
    .requiredOption('-d, --description <description>', 'Project description')
    .option('-o, --organization-id <id>', 'Organization identifier')
    .option('-s, --status <status>', 'Project status', 'active')
    .option(
      '--created-by <username>',
      'Override creator username (defaults to workspace user)',
    )
    .option('-f, --format <format>', 'Output format: table (default) or json')
    .action(async (name: string, options: ProjectCreateOptions) => {
      await withCommandSpan(
        container.telemetry,
        container,
        'project.create',
        { name, ...options },
        'command',
        async (_span) => {
          // Validation milestone
          container.telemetry.captureEvent({
            name: CLI_EVENTS.COMMAND_VALIDATED,
          });

          const workspace = container.getWorkspace();
          const organizationId =
            options.organizationId ?? workspace?.organizationId;

          if (!organizationId) {
            container.telemetry.captureEvent({
              name: CLI_EVENTS.ERROR_VALIDATION,
              attributes: {
                'error.type': 'missing_required_field',
                'error.field': 'organizationId',
              },
            });
            throw new CliUsageError(
              'Organization id missing. Provide --organization-id or initialize the workspace.',
            );
          }

          const description = options.description?.trim();
          if (!description) {
            container.telemetry.captureEvent({
              name: CLI_EVENTS.ERROR_VALIDATION,
              attributes: {
                'error.type': 'empty_field',
                'error.field': 'description',
              },
            });
            throw new CliUsageError('Project description cannot be empty.');
          }

          const creator =
            options.createdBy ??
            workspace?.username ??
            workspace?.userId ??
            'cli';

          const payload: CreateProjectPayload = {
            org_id: organizationId,
            name,
            description,
            status: options.status ?? 'active',
            createdBy: creator,
          };

          // Record creation milestone
          container.telemetry.captureEvent({
            name: CLI_EVENTS.COMMAND_CREATING,
            attributes: {
              'cli.project.name': name,
              'cli.project.organization_id': organizationId,
            },
          });

          const useCases = container.getUseCases();
          await useCases.getOrganization.execute(organizationId);
          const projectDto = await useCases.createProject.execute(payload);

          const format = resolveFormat(options.format);
          const summary = projectToSummary(projectDto);
          printOutput(summary, format);

          // Record success with project details
          container.telemetry.captureEvent({
            name: CLI_EVENTS.COMMAND_CREATED,
            attributes: {
              'cli.project.id': projectDto.id,
              'cli.project.slug': projectDto.slug,
            },
          });

          return projectDto;
        },
      );
    });

  // ------------------- DELETE -------------------
  project
    .command('delete <projectId>')
    .description('Delete a project by its identifier')
    .option('-f, --force', 'Skip confirmation prompt', false)
    .action(async (projectId: string, options: ProjectDeleteOptions) => {
      await withCommandSpan(
        container.telemetry,
        container,
        'project.delete',
        { projectId, ...options },
        'command',
        async (_span) => {
          container.telemetry.captureEvent({
            name: CLI_EVENTS.COMMAND_VALIDATED,
            attributes: {
              'cli.project.id': projectId,
            },
          });

          if (!options.force) {
            if (!process.stdin.isTTY) {
              container.telemetry.captureEvent({
                name: CLI_EVENTS.ERROR_VALIDATION,
                attributes: {
                  'error.type': 'non_interactive_mode',
                },
              });
              throw new CliUsageError(
                'Cannot prompt for confirmation in non-interactive mode. Re-run with --force.',
              );
            }
            const confirmed = await confirmDeletion(projectId);
            if (!confirmed) {
              container.telemetry.captureEvent({
                name: CLI_EVENTS.COMMAND_CANCELLED,
                attributes: {
                  'cli.project.id': projectId,
                },
              });
              console.log('Deletion aborted.');
              return;
            }
          }

          // Record deletion milestone
          container.telemetry.captureEvent({
            name: CLI_EVENTS.COMMAND_DELETING,
            attributes: {
              'cli.project.id': projectId,
            },
          });

          const useCases = container.getUseCases();
          await useCases.deleteProject.execute(projectId);
          console.log(`Project '${projectId}' deleted.`);

          // Record success
          container.telemetry.captureEvent({
            name: CLI_EVENTS.COMMAND_DELETED,
            attributes: {
              'cli.project.id': projectId,
            },
          });
        },
      );
    });
}

// ------------------- HELPERS -------------------
function projectToSummary(project: ProjectOutput) {
  return {
    id: project.id,
    name: project.name,
    organizationId: project.org_id,
    description: project.description,
    status: project.status,
    slug: project.slug,
    createdBy: project.createdBy,
    updatedBy: project.updatedBy,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

async function confirmDeletion(projectId: string): Promise<boolean> {
  const rl = createInterface({ input, output });
  const answer = await rl.question(
    `Delete project '${projectId}'? This cannot be undone. (y/N): `,
  );
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}
