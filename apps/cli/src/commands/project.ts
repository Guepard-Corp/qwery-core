import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';

import type { Command } from 'commander';

import type { ProjectOutput } from '@qwery/domain/usecases';

import { CliContainer } from '../container/cli-container';
import { CliUsageError } from '../utils/errors';
import { printOutput, resolveFormat } from '../utils/output';

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

  project
    .command('list')
    .description('List available projects')
    .option('-o, --organization-id <id>', 'Filter by organization identifier')
    .option('-f, --format <format>', 'Output format: table (default) or json')
    .action(async (options: ProjectListOptions) => {
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
    });

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
      const workspace = container.getWorkspace();
      const organizationId =
        options.organizationId ?? workspace?.organizationId;

      if (!organizationId) {
        throw new CliUsageError(
          'Organization id missing. Provide --organization-id or initialize the workspace.',
        );
      }

      const description = options.description?.trim();
      if (!description) {
        throw new CliUsageError('Project description cannot be empty.');
      }

      const creator =
        options.createdBy ?? workspace?.username ?? workspace?.userId ?? 'cli';

      const payload: CreateProjectPayload = {
        org_id: organizationId,
        name,
        description,
        status: options.status ?? 'active',
        createdBy: creator,
      };

      const useCases = container.getUseCases();

      // Ensure the organization exists before creation (raises if not found)
      await useCases.getOrganization.execute(organizationId);

      const projectDto = await useCases.createProject.execute(payload);

      const format = resolveFormat(options.format);
      const summary = projectToSummary(projectDto);
      printOutput(summary, format);
    });

  project
    .command('delete <projectId>')
    .description('Delete a project by its identifier')
    .option('-f, --force', 'Skip confirmation prompt', false)
    .action(async (projectId: string, options: ProjectDeleteOptions) => {
      if (!options.force) {
        if (!process.stdin.isTTY) {
          throw new CliUsageError(
            'Cannot prompt for confirmation in non-interactive mode. Re-run with --force.',
          );
        }
        const confirmed = await confirmDeletion(projectId);
        if (!confirmed) {
          console.log('Deletion aborted.');
          return;
        }
      }

      const useCases = container.getUseCases();
      await useCases.deleteProject.execute(projectId);
      console.log(`Project '${projectId}' deleted.`);
    });
}

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
