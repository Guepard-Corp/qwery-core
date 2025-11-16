import { StructuredTool } from '@langchain/core/tools';
import type { BaseToolDefinition } from './tools/base-tool';

/**
 * Registry for managing and executing tools for the LangGraph agent.
 */
export class ToolRegistry {
  private tools: Map<string, StructuredTool> = new Map();

  /**
   * Register a tool with the registry
   */
  register(tool: StructuredTool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Register multiple tools at once
   */
  registerMany(tools: StructuredTool[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /**
   * Get a tool by name
   */
  get(name: string): StructuredTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools
   */
  getAll(): StructuredTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool definitions for LangChain tool binding
   */
  getToolDefinitions(): BaseToolDefinition[] {
    return this.getAll().map((tool) => {
      // Convert StructuredTool schema to BaseToolDefinition format
      // StructuredTool.schema is a Zod schema, which matches BaseToolDefinition.schema
      const definition: BaseToolDefinition = {
        name: tool.name,
        description: tool.description,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        schema: tool.schema as any,
      };
      return definition;
    });
  }

  /**
   * Check if a tool is registered
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Execute a tool by name with the given input
   */
  async execute(
    toolName: string,
    input: unknown,
  ): Promise<{ result: unknown; error?: string }> {
    const tool = this.get(toolName);

    if (!tool) {
      return {
        result: null,
        error: `Tool "${toolName}" not found`,
      };
    }

    try {
      const result = await tool.invoke(input);
      return { result };
    } catch (error) {
      return {
        result: null,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error occurred during tool execution',
      };
    }
  }

  /**
   * Clear all registered tools
   */
  clear(): void {
    this.tools.clear();
  }
}
