import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * Base interface for all tools used by the LangGraph agent.
 * Tools should extend StructuredTool from LangChain for compatibility.
 */
export interface BaseToolDefinition {
  name: string;
  description: string;
  schema: z.ZodSchema;
}

/**
 * Type helper for tool input based on schema
 */
export type ToolInput<T extends z.ZodSchema> = z.infer<T>;

/**
 * Tool execution result
 */
export interface ToolResult {
  toolCallId: string;
  toolName: string;
  result: unknown;
  error?: string;
}

/**
 * Base class for tools that can be used by the agent.
 * Extends LangChain's StructuredTool for compatibility.
 */
export abstract class BaseTool extends StructuredTool {
  abstract name: string;
  abstract description: string;
  abstract schema: z.ZodSchema;

  /**
   * Execute the tool with the given input
   */
  abstract _call(input: z.infer<this['schema']>): Promise<string>;

  /**
   * Get the tool definition for registration
   */
  getDefinition(): BaseToolDefinition {
    return {
      name: this.name,
      description: this.description,
      schema: this.schema,
    };
  }
}
