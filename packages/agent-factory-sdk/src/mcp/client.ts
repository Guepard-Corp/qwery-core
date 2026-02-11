import { createMCPClient } from '@ai-sdk/mcp';
import type { Tool } from 'ai';

export type GetMcpToolsOptions = {
  headers?: Record<string, string>;
  namePrefix?: string;
};

export type GetMcpToolsResult = {
  tools: Record<string, Tool>;
  close: () => Promise<void>;
};

/**
 * Connects to an MCP server at the given URL, fetches tools via schema discovery,
 * and returns AI SDK–compatible tools plus a close callback for lifecycle.
 * Used by Registry.tools.forAgent when mcpServerUrl is set.
 *
 * @param serverUrl - Full MCP endpoint URL (e.g. https://localhost:4000/mcp)
 * @param options - Optional headers and name prefix for tool keys (e.g. qwery_)
 */
export async function getMcpTools(
  serverUrl: string,
  options?: GetMcpToolsOptions,
): Promise<GetMcpToolsResult> {
  const url = serverUrl.replace(/\/+$/, '');
  const client = await createMCPClient({
    transport: {
      type: 'http',
      url,
      ...(options?.headers && { headers: options.headers }),
    },
  });

  const rawTools = await client.tools();
  const prefix = options?.namePrefix ?? '';

  const tools: Record<string, Tool> = {};
  for (const [name, tool] of Object.entries(rawTools)) {
    const key = prefix ? `${prefix}${name}` : name;
    tools[key] = tool as Tool;
  }

  return {
    tools,
    close: () => client.close(),
  };
}
