import { Command } from 'commander';

import packageJson from '../package.json' with { type: 'json' };

import { registerDatasourceCommands } from './commands/datasource';
import { registerNotebookCommands } from './commands/notebook';
import { registerProjectCommands } from './commands/project';
import { registerWorkspaceCommands } from './commands/workspace';
import { CliContainer } from './container/cli-container';
import { InteractiveRepl } from './services/interactive-repl';

export class CliApplication {
  private readonly program: Command;

  constructor(
    private readonly container = new CliContainer(),
    program?: Command,
  ) {
    this.program = program ?? new Command();

    this.program
      .name('qwery')
      .description('Qwery Workspace CLI')
      .version(packageJson.version ?? '0.0.0');

    this.program.showHelpAfterError();
    this.program.exitOverride();

    registerWorkspaceCommands(this.program, this.container);
    registerProjectCommands(this.program, this.container);
    registerDatasourceCommands(this.program, this.container);
    registerNotebookCommands(this.program, this.container);
  }

  public async run(argv: string[]): Promise<void> {
    await this.container.init();
    try {
      if (argv.length <= 2) {
        // Start interactive REPL mode (Cursor CLI style)
        const repl = new InteractiveRepl(this.container);
        await repl.start();
        return;
      }
      await this.program.parseAsync(argv);
    } finally {
      await this.container.persist();
    }
  }
}
