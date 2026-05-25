/**
 * CLI/TUI event names — session lifecycle, slash commands and SQL execution.
 */
export const CLI_EVENTS = {
  SESSION_STARTED: 'cli.session.started',
  SESSION_ENDED: 'cli.session.ended',

  COMMAND_EXECUTED: 'cli.command.executed',
  SHELL_EXECUTED: 'cli.shell.executed',

  DATASOURCE_ATTACHED: 'cli.datasource.attached',
  DATASOURCE_DETACHED: 'cli.datasource.detached',
  DATASOURCE_TESTED: 'cli.datasource.tested',

  UPDATE_CHECKED: 'cli.update.checked',
} as const;

export type CliEventName = (typeof CLI_EVENTS)[keyof typeof CLI_EVENTS];
