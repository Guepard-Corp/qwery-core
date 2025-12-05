import { streamText, UIMessage, Experimental_Agent } from 'ai';
import { z } from 'zod';
import type { AnyActorRef } from 'xstate';

/**
 * List of intents that the agent can handle.
 * Each intent will be managed by a separate agent that is specialized in handling that intent and all the related tasks.
 * This is important to keep the agents focused and specialized in their tasks and make hard guard on destructive actions.
 * supported: true if the intent is supported by the agent, false otherwise.
 */
export const INTENTS_LIST = [
  // Generic intents
  {
    name: 'greeting',
    description: 'When the user says hello, hi, etc.',
    supported: true,
    destructive: false,
  },
  {
    name: 'goodbye',
    description: 'When the user says goodbye, bye, etc.',
    destructive: false,
  },
  {
    name: 'help',
    description: 'When the user asks for help',
    destructive: false,
  },
  {
    name: 'feedback',
    description: 'When the user provides feedback',
    destructive: false,
  },
  {
    name: 'other',
    description: 'When the user says something else',
    supported: true,
    destructive: false,
  },

  // Qwery application related intents
  {
    name: 'create-datasource',
    description: 'When the user wants to create a new application',
    destructive: false,
  },
  {
    name: 'update-datasource',
    description: 'When the user wants to update a datasource',
    destructive: true,
  },
  {
    name: 'read-datasource',
    description: 'When the user wants to read a datasource',
    destructive: false,
  },
  {
    name: 'list-datasources',
    description: 'When the user wants to list all datasources',
    destructive: false,
  },
  {
    name: 'test-datasource-connection',
    description: 'When the user wants to test the connection to a datasource',
    destructive: false,
  },
  {
    name: 'delete-datasource',
    description: 'When the user wants to delete a datasource',
    destructive: true,
  },
  {
    name: 'list-notebooks',
    description: 'When the user wants to list all notebooks',
    destructive: false,
  },
  {
    name: 'create-notebook',
    description: 'When the user wants to create a notebook',
    destructive: false,
  },
  {
    name: 'update-notebook',
    description: 'When the user wants to update a notebook',
    destructive: true,
  },
  {
    name: 'delete-notebook',
    description: 'When the user wants to delete a notebook',
    destructive: true,
  },
  {
    name: 'read-notebook',
    description: 'When the user wants to read a notebook',
    destructive: false,
  },

  // Data related intents
  {
    name: 'read-data',
    description: 'When the user wants to query the data',
    supported: true,
    destructive: false,
  },
  {
    name: 'write-data',
    description: 'When the user wants to update or insert data into the data',
    destructive: true,
  },
  {
    name: 'delete-data',
    description: 'When the user wants to delete data from the data',
    destructive: true,
  },

  // Database related intents
  {
    name: 'create-database',
    description: 'When the user wants to create a new database',
    destructive: false,
  },
  {
    name: 'stop-database',
    description: 'When the user wants to stop a database',
    destructive: true,
  },
  {
    name: 'start-database',
    description: 'When the user wants to start a database',
    destructive: true,
  },
  {
    name: 'restart-database',
    description: 'When the user wants to restart a database',
    destructive: true,
  },
  {
    name: 'backup-database',
    description: 'When the user wants to backup a database',
    destructive: false,
  },
  {
    name: 'restore-database',
    description: 'When the user wants to restore a backup of a database',
    destructive: true,
  },
  {
    name: 'monitor-database',
    description: 'When the user wants to monitor the database',
    destructive: false,
  },
  {
    name: 'delete-database',
    description: 'When the user wants to delete a database',
    destructive: true,
  },
  {
    name: 'branch-database',
    description: 'When the user wants to branch a database',
    destructive: false,
  },
  {
    name: 'checkout-database',
    description: 'When the user wants to checkout a database version',
    destructive: true,
  },
  {
    name: 'snapshot-database',
    description: 'When the user wants to snapshot a database',
    destructive: false,
  },

  // API related intents
  {
    name: 'create-api',
    description: 'When the user wants to create an API for the data',
    destructive: false,
  },
  {
    name: 'deploy-api',
    description: 'When the user wants to deploy an API for the data',
    destructive: false,
  },
  {
    name: 'delete-api',
    description: 'When the user wants to delete an API for the data',
    destructive: true,
  },
  {
    name: 'update-api',
    description: 'When the user wants to update an API for the data',
    destructive: true,
  },

  // Apps related intents
  {
    name: 'create-app',
    description: 'When the user wants to create a new app',
    destructive: false,
  },
  {
    name: 'update-app',
    description: 'When the user wants to update an app',
    destructive: true,
  },
  {
    name: 'delete-app',
    description: 'When the user wants to delete an app',
    destructive: true,
  },
  {
    name: 'read-app',
    description: 'When the user wants to read an app',
    destructive: false,
  },
  {
    name: 'list-apps',
    description: 'When the user wants to list all apps',
    destructive: false,
  },
  {
    name: 'deploy-app',
    description: 'When the user wants to deploy an app',
    destructive: false,
  },
  {
    name: 'delete-app',
    description: 'When the user wants to delete an app',
    destructive: true,
  },

  // Decision related intents
  {
    name: 'make-decision',
    description: 'When the user wants to make a decision',
    destructive: false,
  },

  // Forecast related intents
  {
    name: 'forecast',
    description: 'When the user wants to forecast the data',
    destructive: false,
  },
  {
    name: 'forecast-analysis',
    description: 'When the user wants to analyze the forecast',
    destructive: false,
  },
  {
    name: 'forecast-report',
    description: 'When the user wants to create a report for the forecast',
    destructive: false,
  },
  {
    name: 'forecast-update',
    description: 'When the user wants to update the forecast',
    destructive: true,
  },

  // Visualization related intents
  {
    name: 'show-visualization',
    description: 'When the user wants to see a visualization of the data',
    destructive: false,
  },

  // Dashboard related intents
  {
    name: 'create-dashboard',
    description: 'When the user wants to create a dashboard',
    destructive: false,
  },

  // Report related intents
  {
    name: 'create-report',
    description: 'When the user wants to create a report',
    destructive: false,
  },

  // Chart related intents
  {
    name: 'create-chart',
    description: 'When the user wants to create a chart',
    destructive: false,
  },

  // Schema related intents
  {
    name: 'read-schema',
    description: 'When the user wants to read the schema',
    destructive: false,
  },
  {
    name: 'list-schemas',
    description: 'When the user wants to list all schemas',
    destructive: false,
  },
  {
    name: 'update-schema',
    description: 'When the user wants to update the schema',
    destructive: true,
  },

  // Index related intents
  {
    name: 'create-index',
    description: 'When the user wants to create an index',
    destructive: false,
  },

  // Trigger related intents
  {
    name: 'create-trigger',
    description: 'When the user wants to create a trigger',
    destructive: false,
  },

  // Function related intents
  {
    name: 'create-function',
    description: 'When the user wants to create a function',
    destructive: false,
  },

  // Procedure related intents
  {
    name: 'create-procedure',
    description: 'When the user wants to create a procedure',
    destructive: false,
  },
];
const intentNames = INTENTS_LIST.map((intent) => intent.name) as [
  string,
  ...string[],
];

export const IntentSchema = z.object({
  intent: z.enum(intentNames),
  complexity: z.enum(['simple', 'medium', 'complex']),
});

export type Intent = z.infer<typeof IntentSchema>;

export type AgentContext = {
  conversationId: string;
  inputMessage: string;
  response: string;
  previousMessages: UIMessage[]; // full UI messages history
  streamResult?:
    | ReturnType<typeof streamText>
    | ReturnType<(typeof Experimental_Agent)['prototype']['stream']>; // holds the streaming result from AI SDK
  intent: Intent;
  error?: string;
  retryCount?: number; // Track retry attempts
  lastError?: Error; // Store last error for retry logic
  enhancementActors?: Array<{ id: string; ref: AnyActorRef }>; // Track spawned actors
};

export type AgentEvents =
  | { type: 'USER_INPUT'; messages: UIMessage[] }
  | { type: 'STOP' }
  | { type: 'SEND_RESPONSE'; response: string }
  | { type: 'LLM_READY'; streamResult: ReturnType<typeof streamText> }
  | { type: 'INTENT_DETECTED'; intent: Intent }
  | { type: 'GET_INTENT' };
