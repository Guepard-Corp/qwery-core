/**
 * CLI Event Schemas and Constants
 * 
 * Defines event types and their expected attributes for CLI telemetry
 */

export const CLI_EVENTS = {
  // Command lifecycle
  COMMAND_STARTED: 'cli.command.started',
  COMMAND_VALIDATED: 'cli.command.validated',
  COMMAND_EXECUTING: 'cli.command.executing',
  COMMAND_COMPLETED: 'cli.command.completed',
  COMMAND_CANCELLED: 'cli.command.cancelled',

  // Command operations
  COMMAND_CREATING: 'cli.command.creating',
  COMMAND_CREATED: 'cli.command.created',
  COMMAND_DELETING: 'cli.command.deleting',
  COMMAND_DELETED: 'cli.command.deleted',
  COMMAND_INITIALIZING: 'cli.command.initializing',
  COMMAND_INITIALIZED: 'cli.command.initialized',
  COMMAND_TESTING_CONNECTION: 'cli.command.testing_connection',
  COMMAND_CONNECTION_SUCCESS: 'cli.command.connection_success',
  COMMAND_ADDING_CELL: 'cli.command.adding_cell',
  COMMAND_CELL_ADDED: 'cli.command.cell_added',
  COMMAND_EXECUTED: 'cli.command.executed',
  COMMAND_UPDATING_CELL: 'cli.command.updating_cell',

  // Results
  COMMAND_RESULT: 'cli.command.result',

  // Errors
  ERROR_VALIDATION: 'cli.error.validation',
  ERROR_EXECUTION: 'cli.error.execution',
  ERROR_CONNECTION: 'cli.error.connection',
  ERROR_NOT_FOUND: 'cli.error.not_found',

  // Query execution
  QUERY_EXECUTED: 'cli.query.executed',
} as const;

export type CliEventName = typeof CLI_EVENTS[keyof typeof CLI_EVENTS];

/**
 * CLI Event Attribute Schemas
 */
export interface CliCommandAttributes {
  'cli.command.name': string;
  'cli.command.group'?: string;
  'cli.command.action'?: string;
  'cli.command.args'?: string; // JSON stringified
  'cli.command.duration_ms'?: string;
  'cli.command.status'?: 'success' | 'error' | 'cancelled';
  'cli.command.result.count'?: number;
  'cli.command.result.format'?: string;
}

export interface CliWorkspaceAttributes {
  'cli.workspace.user_id'?: string;
  'cli.workspace.organization_id'?: string;
  'cli.workspace.project_id'?: string;
  'cli.workspace.id'?: string;
}

export interface CliErrorAttributes {
  'error.type': string;
  'error.field'?: string;
  'error.message'?: string;
  'error.stack'?: string;
  'resource.type'?: string;
  'resource.id'?: string;
}

export interface CliQueryAttributes {
  'query.mode'?: 'sql' | 'natural';
  'query.duration_ms'?: string;
  'query.row_count'?: string;
  'query.length'?: number;
  'datasource.id'?: string;
  'notebook.id'?: string;
}

export interface CliConnectionAttributes {
  'datasource.id'?: string;
  'datasource.provider'?: string;
  'connection.duration_ms'?: string;
}

export interface CliNotebookAttributes {
  'notebook.id'?: string;
  'notebook.slug'?: string;
  'notebook.title'?: string;
  'notebook.project_id'?: string;
  'cell.id'?: string;
  'cell.type'?: 'query' | 'prompt';
  'cell.run_mode'?: 'default' | 'fixit';
}

export interface CliDatasourceAttributes {
  'datasource.id'?: string;
  'datasource.slug'?: string;
  'datasource.name'?: string;
  'datasource.provider'?: string;
}

export interface CliProjectAttributes {
  'project.id'?: string;
  'project.slug'?: string;
  'project.name'?: string;
  'project.organization_id'?: string;
}

/**
 * Complete CLI event attributes (union of all attribute types)
 */
export type CliEventAttributes = CliCommandAttributes &
  CliWorkspaceAttributes &
  CliErrorAttributes &
  CliQueryAttributes &
  CliConnectionAttributes &
  CliNotebookAttributes &
  CliDatasourceAttributes &
  CliProjectAttributes &
  Record<string, string | number | boolean | undefined>;

