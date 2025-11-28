import type { Command } from 'commander';
import { v4 as uuidv4 } from 'uuid';

import type { Workspace } from '@qwery/domain/entities';
import { WorkspaceModeEnum, WorkspaceRuntimeEnum } from '@qwery/domain/enums';

import { CliContainer } from '../container/cli-container';
import { CliUsageError } from '../utils/errors';
import { printOutput, resolveFormat } from '../utils/output';

interface WorkspaceInitOptions {
  userId?: string;
  organizationId?: string;
  projectId?: string;
  format?: string;
}

interface WorkspaceShowOptions {
  format?: string;
}

export function registerWorkspaceCommands(
  program: Command,
  container: CliContainer,
) {
  const workspace = program
    .command('workspace')
    .description('Manage the current workspace context');

  workspace
    .command('init')
    .description('Initialize the workspace context via the domain use case')
    .option('-u, --user-id <id>', 'Existing user identifier to rehydrate')
    .option('-o, --organization-id <id>', 'Preferred organization identifier')
    .option('-p, --project-id <id>', 'Preferred project identifier')
    .option('-f, --format <format>', 'Output format: table (default) or json')
    .action(async (options: WorkspaceInitOptions) => {
      const useCases = container.getUseCases();
      const previous = container.getWorkspace();

      const userId = options.userId ?? previous?.userId ?? '';
      const organizationId = options.organizationId ?? previous?.organizationId;
      const projectId = options.projectId ?? previous?.projectId;

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

      container.setWorkspace(state);

      const format = resolveFormat(options.format);
      const summary = {
        workspaceId: state.id,
        userId: state.userId,
        username: state.username,
        organizationId: state.organizationId ?? '(none)',
        projectId: state.projectId ?? '(none)',
        mode: state.mode,
        isAnonymous: state.isAnonymous,
        stateFile: container.getStateFilePath(),
      };

      printOutput(summary, format, 'Workspace not initialized yet.');
    });

  workspace
    .command('show')
    .description('Show the workspace snapshot stored on disk')
    .option('-f, --format <format>', 'Output format: table (default) or json')
    .action((options: WorkspaceShowOptions) => {
      const state = container.getWorkspace();
      if (!state) {
        throw new CliUsageError(
          'Workspace not initialized. Run `qwery workspace init` first.',
        );
      }

      const format = resolveFormat(options.format);
      const summary = {
        workspaceId: state.id,
        userId: state.userId,
        username: state.username,
        organizationId: state.organizationId ?? '(none)',
        projectId: state.projectId ?? '(none)',
        mode: state.mode,
        isAnonymous: state.isAnonymous,
        stateFile: container.getStateFilePath(),
      };
      printOutput(summary, format);
    });
}
