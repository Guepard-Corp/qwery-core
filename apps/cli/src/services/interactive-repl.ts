import { createInterface, type Interface } from 'node:readline';
import { stdin, stdout } from 'node:process';
import type { CliContainer } from '../container/cli-container';
import { InteractiveContext } from './interactive-context';
import { InteractiveQueryHandler } from './interactive-query-handler';
import { InteractiveCommandRouter } from './interactive-command-router';
import { printInteractiveResult } from '../utils/output';
import { colored, colors } from '../utils/formatting';
import { FactoryAgent, validateUIMessages } from '@qwery/agent-factory-sdk';
import { nanoid } from 'nanoid';

export class InteractiveRepl {
  private rl: Interface | null = null;
  private context: InteractiveContext;
  private queryHandler: InteractiveQueryHandler;
  private commandRouter: InteractiveCommandRouter;
  private isRunning = false;
  private isProcessing = false;
  private agent: FactoryAgent | null = null;
  private conversationId: string | null = null;

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
      // Block input while processing a query
      if (this.isProcessing) {
        return;
      }

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
      console.log(
        '\n' + colored('✓ Goodbye! See you next time!', colors.green) + '\n',
      );
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
              colored('⚠️  Usage:', colors.yellow) +
              ' ' +
              colored('/use <datasource-id>', colors.brand) +
              '\n' +
              colored('Example:', colors.dim) +
              ' ' +
              colored(
                '/use d7d411d0-8fbf-46a8-859d-7aca6abfad14',
                colors.white,
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
            colored('❌ Unknown command:', colors.red) +
            ' ' +
            colored(`/${cmd}`, colors.white) +
            '\n' +
            colored('Type', colors.dim) +
            ' ' +
            colored('/help', colors.brand) +
            ' ' +
            colored('for available commands.', colors.dim) +
            '\n',
        );
    }

    if (this.isRunning) {
      this.rl?.setPrompt(this.getPrompt());
      this.rl?.prompt();
    }
  }

  private async handleQuery(query: string): Promise<void> {
    // Block further input while processing
    this.isProcessing = true;
    this.rl?.pause();

    try {
      // Check if this is a Google Sheet query (contains google.com/spreadsheets)
      const isGoogleSheetQuery = /google\.com\/spreadsheets/.test(query);

      if (isGoogleSheetQuery) {
        // For Google Sheets, use FactoryAgent directly (no datasource needed)
        await this.handleGoogleSheetQuery(query);
        return;
      }

      // Check if this looks like a natural language query (not SQL)
      // SQL queries typically start with SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, etc.
      // Note: "SHOW" is a SQL keyword, but "show me" is natural language, so we need to be more specific
      const sqlKeywordPattern =
        /^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TRUNCATE|EXPLAIN|WITH|SHOW\s+(TABLES|DATABASES|COLUMNS|INDEXES|GRANTS|PROCESSLIST|VARIABLES|STATUS|SCHEMAS|CREATE|FULL|ENGINE|WARNINGS|ERRORS)|DESCRIBE|DESC)\s+/i;
      const isSqlQuery = sqlKeywordPattern.test(query);

      if (!isSqlQuery) {
        // Natural language query - use FactoryAgent (no datasource needed)
        await this.handleNaturalLanguageQuery(query);
        return;
      }

      // SQL query requires a datasource
      const datasource = await this.context.getCurrentDatasource();

      if (!datasource) {
        console.log(
          '\n' +
            colored('⚠️  No datasource selected.', colors.yellow) +
            '\n' +
            colored('Use', colors.dim) +
            ' ' +
            colored('/use <datasource-id>', colors.brand) +
            ' ' +
            colored('to select a datasource first.', colors.dim) +
            '\n',
        );
        return;
      }

      // Show query
      console.log(
        '\n' +
          colored('📝 Query:', colors.brand) +
          ' ' +
          colored(query, colors.white) +
          '\n',
      );

      try {
        const result = await this.queryHandler.execute(query, datasource);
        printInteractiveResult(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(
          '\n' +
            colored('❌ Error:', colors.red) +
            ' ' +
            colored(message, colors.white) +
            '\n',
        );
      }
    } finally {
      this.isProcessing = false;
      if (this.isRunning) {
        console.log('\n' + colored('─'.repeat(60), colors.gray) + '\n');
        this.rl?.resume();
        this.rl?.setPrompt(this.getPrompt());
        this.rl?.prompt();
      }
    }
  }

  private async handleNaturalLanguageQuery(query: string): Promise<void> {
    // Blocking is already handled in handleQuery
    console.log('\n' + colored('💬 Natural Language Query', colors.brand));
    console.log(colored('─'.repeat(60), colors.gray));

    await this.processAgentQuery(query);
  }

  private async handleGoogleSheetQuery(query: string): Promise<void> {
    // Blocking is already handled in handleQuery
    console.log('\n' + colored('🌐 Google Sheet Query Detected', colors.brand));
    console.log(colored('─'.repeat(60), colors.gray));

    await this.processAgentQuery(query);
  }

  private async processAgentQuery(query: string): Promise<void> {
    try {
      // Use a persistent agent and conversation ID so follow-up questions work
      if (!this.agent || !this.conversationId) {
        this.conversationId = `cli-agent-${nanoid()}`;
        this.agent = new FactoryAgent({ conversationId: this.conversationId });
      }
      const agent = this.agent;

      const messages = [
        {
          id: nanoid(),
          role: 'user' as const,
          parts: [{ type: 'text' as const, text: query }],
        },
      ];

      // Validate and call agent
      validateUIMessages({ messages });

      const responsePromise = agent
        .respond({
          messages: messages,
        })
        .catch((error) => {
          console.error(colored('❌ Agent error:', colors.red), error);
          throw error;
        });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('Agent response timeout after 120 seconds')),
          120000,
        );
      });

      let response: Response;
      try {
        response = await Promise.race([responsePromise, timeoutPromise]);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to get agent response: ${errorMsg}`);
      }

      if (!response.body) {
        throw new Error('Agent returned no response body');
      }

      // Stream and parse the SSE response with clean formatting
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let textContent = '';
      let isFirstChunk = true;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE format (data: {...}\n\n or data: {...}\n)
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (!line.trim() || line.startsWith(':')) {
              continue; // Skip empty lines and comments
            }

            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim(); // Remove 'data: ' prefix

              if (data === '[DONE]') {
                continue;
              }

              try {
                const parsed = JSON.parse(data);

                // Handle text deltas - stream them directly with clean formatting
                if (parsed.type === 'text-delta' && parsed.delta) {
                  if (isFirstChunk) {
                    isFirstChunk = false;
                    console.log(''); // Add spacing before response
                  }
                  process.stdout.write(parsed.delta);
                  textContent += parsed.delta;
                }

                // Handle tool output errors - show them cleanly
                if (parsed.type === 'tool-output-error') {
                  const errorMsg =
                    parsed.errorText || parsed.message || 'Unknown error';
                  // Only show non-critical errors (DuckDB import errors are expected in some cases)
                  if (!errorMsg.includes('Cannot find package')) {
                    console.log(
                      `\n${colored('⚠️  Warning:', colors.yellow)} ${errorMsg}`,
                    );
                  }
                }

                // Handle finish
                if (parsed.type === 'finish' || parsed.type === 'text-end') {
                  // Response complete
                }
              } catch {
                // Ignore non-JSON chunks; agent should send structured events
              }
            }
          }
        }

        // Process any remaining buffer
        if (buffer.trim()) {
          if (buffer.startsWith('data: ')) {
            const data = buffer.slice(6).trim();
            if (data !== '[DONE]') {
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'text-delta' && parsed.delta) {
                  process.stdout.write(parsed.delta);
                  textContent += parsed.delta;
                }
              } catch {
                // Ignore parse errors for incomplete data
              }
            }
          }
        }
      } catch (streamError) {
        console.error(
          '\n' +
            colored('⚠️  Error while streaming:', colors.yellow) +
            ' ' +
            (streamError instanceof Error
              ? streamError.message
              : String(streamError)),
        );
      } finally {
        reader.releaseLock();
      }

      // Add final spacing and summary
      if (textContent.trim().length > 0) {
        console.log('\n' + colored('─'.repeat(60), colors.gray));
        console.log(colored('✓ Response complete', colors.green) + '\n');
      } else {
        console.log(
          '\n' +
            colored('⚠️  Warning: Response stream was empty', colors.yellow) +
            '\n',
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(
        '\n' +
          colored('❌ Error:', colors.red) +
          ' ' +
          colored(message, colors.white) +
          '\n',
      );
    } finally {
      // Re-enable input after processing is complete
      this.isProcessing = false;
      if (this.isRunning) {
        this.rl?.resume();
        this.rl?.setPrompt(this.getPrompt());
        this.rl?.prompt();
      }
    }
  }

  private getPrompt(): string {
    const datasourceName = this.context.getDatasourceName();
    if (datasourceName) {
      return (
        colored('qwery', colors.prompt) +
        ' ' +
        colored(`[${datasourceName}]`, colors.brand) +
        colored('>', colors.prompt) +
        ' '
      );
    }
    return colored('qwery', colors.prompt) + colored('>', colors.prompt) + ' ';
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
      console.log(
        '\n' +
          colored('❌ Error:', colors.red) +
          ' ' +
          colored(message, colors.white) +
          '\n',
      );
    }

    if (this.isRunning) {
      console.log(colored('─'.repeat(60), colors.gray) + '\n');
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

${colored('Query Tips:', colors.white)}
  ${colored('•', colors.brand)} Natural language queries go to the AI agent (no datasource needed)
  ${colored('•', colors.brand)} SQL queries require ${colored('/use <datasource-id>', colors.brand)}
  ${colored('•', colors.brand)} Wait for ${colored('✓ Response complete', colors.green)} before typing the next query
  ${colored('•', colors.brand)} Share the Google Sheet URL once; follow-up questions reuse it`;

    console.log('\n' + helpText + '\n');
  }

  private showWelcome(): void {
    console.log(
      '\n' +
        colored('Welcome to Qwery CLI Interactive Mode!', colors.brand) +
        '\n',
    );
    console.log(
      colored('Type', colors.dim) +
        ' ' +
        colored('/help', colors.brand) +
        ' ' +
        colored('to see available commands.', colors.dim),
    );
    console.log(
      colored('Type', colors.dim) +
        ' ' +
        colored('/use <datasource-id>', colors.brand) +
        ' ' +
        colored('to select a datasource.', colors.dim),
    );
    console.log(
      colored(
        'Natural language queries go to the AI agent automatically.',
        colors.dim,
      ),
    );
    console.log(
      colored('Tip:', colors.dim) +
        ' ' +
        colored(
          'Run one query at a time and wait for ✓ Response complete.',
          colors.dim,
        ) +
        '\n',
    );
  }
}
