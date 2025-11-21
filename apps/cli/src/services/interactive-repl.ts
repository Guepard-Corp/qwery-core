import { createInterface, type Interface } from 'node:readline';
import { stdin, stdout } from 'node:process';
import type { CliContainer } from '../container/cli-container';
import { InteractiveContext } from './interactive-context';
import { InteractiveQueryHandler } from './interactive-query-handler';
import { InteractiveCommandRouter } from './interactive-command-router';
import { printInteractiveResult } from '../utils/output';
import {
  infoBox,
  successBox,
  errorBox,
  warningBox,
  queryBox,
  separator,
  colored,
  colors,
} from '../utils/formatting';

export class InteractiveRepl {
  private rl: Interface | null = null;
  private context: InteractiveContext;
  private queryHandler: InteractiveQueryHandler;
  private commandRouter: InteractiveCommandRouter;
  private isRunning = false;

  constructor(private readonly container: CliContainer) {
    this.context = new InteractiveContext(container);
    this.queryHandler = new InteractiveQueryHandler(container);
    this.commandRouter = new InteractiveCommandRouter(container);
  }

  public async start(): Promise<void> {
    // Show welcome message
    this.showWelcome();

    this.rl = createInterface({
      input: stdin,
      output: stdout,
      prompt: this.getPrompt(),
    });

    this.isRunning = true;
    this.rl.setPrompt(this.getPrompt());
    this.rl.prompt();

    this.rl.on('line', async (input: string) => {
      const trimmed = input.trim();

      if (trimmed === '') {
        // Empty input - just show prompt again (Cursor behavior)
        this.rl?.setPrompt(this.getPrompt());
        this.rl?.prompt();
        return;
      }

      // Handle REPL commands (start with /)
      if (trimmed.startsWith('/')) {
        await this.handleReplCommand(trimmed);
        return;
      }

      // Check if it's a CLI command (workspace, datasource, notebook, project)
      const firstWord = trimmed.split(/\s+/)[0];
      if (
        firstWord &&
        ['workspace', 'datasource', 'notebook', 'project'].includes(firstWord)
      ) {
        await this.handleCliCommand(trimmed);
        return;
      }

      // Handle queries (SQL or natural language)
      await this.handleQuery(trimmed);
    });

    this.rl.on('close', () => {
      this.isRunning = false;
      console.log('\n' + successBox('Goodbye! See you next time!') + '\n');
      process.exit(0);
    });
  }

  private async handleReplCommand(command: string): Promise<void> {
    const [cmd, ...args] = command.slice(1).trim().split(/\s+/);
    if (!cmd) {
      this.showHelp();
      return;
    }
    const cmdLower = cmd.toLowerCase();

    switch (cmdLower) {
      case 'help':
        this.showHelp();
        break;
      case 'exit':
        this.rl?.close();
        return;
      case 'clear':
        console.clear();
        this.showWelcome();
        break;
      case 'use':
        if (args.length === 0) {
          console.log(
            '\n' +
              warningBox(
                'Usage: /use <datasource-id>\n\nExample: /use d7d411d0-8fbf-46a8-859d-7aca6abfad14',
              ) +
              '\n',
          );
        } else {
          const datasourceId = args[0];
          if (datasourceId) {
            await this.context.setDatasource(datasourceId);
          }
        }
        break;
      default:
        console.log(
          '\n' +
            errorBox(
              `Unknown command: /${cmd}\n\nType /help for available commands.`,
            ) +
            '\n',
        );
    }

    if (this.isRunning) {
      this.rl?.setPrompt(this.getPrompt());
      this.rl?.prompt();
    }
  }

  private async handleQuery(query: string): Promise<void> {
    const datasource = await this.context.getCurrentDatasource();

    if (!datasource) {
      console.log(
        '\n' +
          warningBox(
            'No datasource selected.\n\nUse /use <datasource-id> to select a datasource first.',
          ) +
          '\n',
      );
      this.rl?.setPrompt(this.getPrompt());
      this.rl?.prompt();
      return;
    }

    // Show query in a box
    console.log('\n' + queryBox(query) + '\n');

    try {
      const result = await this.queryHandler.execute(query, datasource);
      printInteractiveResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log('\n' + errorBox(message) + '\n');
    }

    if (this.isRunning) {
      console.log(separator() + '\n');
      this.rl?.setPrompt(this.getPrompt());
      this.rl?.prompt();
    }
  }

  private getPrompt(): string {
    const datasourceName = this.context.getDatasourceName();
    if (datasourceName) {
      return (
        colored('qwery', colors.brand) +
        ' ' +
        colored(`[${datasourceName}]`, colors.brand) +
        colored('>', colors.white) +
        ' '
      );
    }
    return colored('qwery', colors.brand) + colored('>', colors.white) + ' ';
  }

  private async handleCliCommand(command: string): Promise<void> {
    try {
      const parts = command.trim().split(/\s+/);
      const cmd = parts[0];
      if (!cmd) {
        return;
      }
      const args = parts.slice(1);
      await this.commandRouter.execute(cmd, args);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log('\n' + errorBox(message) + '\n');
    }

    if (this.isRunning) {
      console.log(separator() + '\n');
      this.rl?.setPrompt(this.getPrompt());
      this.rl?.prompt();
    }
  }

  private showHelp(): void {
    const maxCmdWidth = 30; // Maximum width for command column

    const formatCommand = (cmd: string, desc: string): string => {
      const cmdDisplay = colored(cmd, colors.brand);
      // Calculate visible length (cmd without ANSI codes) for proper alignment
      const cmdVisibleLength = cmd.length;
      const padding = ' '.repeat(Math.max(1, maxCmdWidth - cmdVisibleLength));
      return `  ${cmdDisplay}${padding}${colored(desc, colors.white)}`;
    };

    const helpText = `${colored('REPL Commands:', colors.white)}

${formatCommand('/help', 'Show this help message')}
${formatCommand('/exit', 'Exit the REPL')}
${formatCommand('/clear', 'Clear the screen')}
${formatCommand('/use <datasource-id>', 'Select a datasource to query')}

${colored('CLI Commands (available in interactive mode):', colors.white)}

${formatCommand('workspace init', 'Initialize workspace')}
${formatCommand('workspace show', 'Show workspace info')}
${formatCommand('datasource create <name>', 'Create datasource')}
${formatCommand('datasource list', 'List datasources')}
${formatCommand('datasource test <id>', 'Test datasource')}
${formatCommand('notebook create <title>', 'Create notebook')}
${formatCommand('notebook list', 'List notebooks')}
${formatCommand('notebook add-cell <id>', 'Add cell to notebook')}
${formatCommand('notebook run <id>', 'Run notebook')}
${formatCommand('project list', 'List projects')}
${formatCommand('project create <name>', 'Create project')}
${formatCommand('project delete <id>', 'Delete project')}

${colored('Just type SQL queries directly to execute them.', colors.white)}`;
    console.log('\n' + infoBox(helpText) + '\n');
  }

  private showWelcome(): void {
    const welcomeText = `${colored('Welcome to Qwery CLI Interactive Mode!', colors.white)}

${colored('Type', colors.white)} ${colored('/help', colors.brand)} ${colored('to see available commands.', colors.white)}
${colored('Type', colors.white)} ${colored('/use <datasource-id>', colors.brand)} ${colored('to select a datasource.', colors.white)}
${colored('Just type SQL queries directly to execute them.', colors.white)}`;
    console.log('\n' + successBox(welcomeText) + '\n');
  }
}
