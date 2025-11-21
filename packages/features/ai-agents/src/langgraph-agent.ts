import { BaseMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import { StateGraph, END, START } from '@langchain/langgraph/web';
import { ToolRegistry } from './tool-registry';
import type { StructuredTool } from '@langchain/core/tools';
import { WebLLMChatModel } from './webllm-chat-model';
import type { InitProgressCallback } from '@mlc-ai/web-llm';

/**
 * State schema for the LangGraph agent
 */
export interface AgentState {
  messages: BaseMessage[];
}

/**
 * Options for creating a LangGraph agent
 */
export interface LangGraphAgentOptions {
  model?: string;
  tools?: StructuredTool[];
  maxIterations?: number;
  temperature?: number;
  initProgressCallback?: InitProgressCallback;
}

/**
 * Creates a LangGraph agent with ReAct pattern
 */
export function createLangGraphAgent(options: LangGraphAgentOptions = {}) {
  const {
    model = 'Llama-3.1-8B-Instruct-q4f32_1-MLC',
    tools = [],
    temperature = 0.1,
    initProgressCallback,
  } = options;

  // Initialize WebLLM ChatModel using MLCEngine directly
  // This approach explicitly loads the model like browser-chat-transport
  const llm = new WebLLMChatModel({
    model,
    temperature,
    initProgressCallback,
  });

  // Create tool registry
  const toolRegistry = new ToolRegistry();
  if (tools.length > 0) {
    toolRegistry.registerMany(tools);
  }

  // Bind tools to LLM
  const allTools = toolRegistry.getAll();
  const llmWithTools =
    allTools.length > 0 && llm.bindTools ? llm.bindTools(allTools) : llm;

  /**
   * Agent node: Invokes LLM with messages and tools
   */
  async function agentNode(state: AgentState): Promise<Partial<AgentState>> {
    const response = await llmWithTools.invoke(state.messages);
    return {
      messages: [response],
    };
  }

  /**
   * Tools node: Executes tool calls from the agent response
   */
  async function toolsNode(state: AgentState): Promise<Partial<AgentState>> {
    const lastMessage = state.messages[state.messages.length - 1];

    if (!(lastMessage instanceof AIMessage)) {
      return { messages: [] };
    }

    const toolCalls = lastMessage.tool_calls || [];
    const toolMessages: ToolMessage[] = [];

    for (const toolCall of toolCalls) {
      const { name, args, id } = toolCall;
      const toolCallId = id || `call_${Date.now()}_${Math.random()}`;
      const tool = toolRegistry.get(name);

      if (!tool) {
        toolMessages.push(
          new ToolMessage({
            tool_call_id: toolCallId,
            content: `Error: Tool "${name}" not found`,
          }),
        );
        continue;
      }

      try {
        const result = await tool.invoke(args);
        toolMessages.push(
          new ToolMessage({
            tool_call_id: toolCallId,
            content:
              typeof result === 'string' ? result : JSON.stringify(result),
          }),
        );
      } catch (error) {
        toolMessages.push(
          new ToolMessage({
            tool_call_id: toolCallId,
            content: `Error: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          }),
        );
      }
    }

    return {
      messages: toolMessages,
    };
  }

  /**
   * Router node: Determines the next step in the ReAct loop
   */
  function shouldContinue(state: AgentState): 'tools' | typeof END {
    const lastMessage = state.messages[state.messages.length - 1];

    // If no messages, end
    if (!lastMessage) {
      return END;
    }

    // If last message is an AI message with tool calls, execute tools
    if (
      lastMessage instanceof AIMessage &&
      lastMessage.tool_calls &&
      lastMessage.tool_calls.length > 0
    ) {
      return 'tools';
    }

    // Otherwise, end (no more tool calls needed)
    return END;
  }

  // Build the graph

  const workflow = new StateGraph<AgentState>({
    channels: {
      messages: {
        reducer: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
        default: () => [],
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .addNode('agent', agentNode as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .addNode('tools', toolsNode as any)
    .addEdge(START, 'agent')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .addConditionalEdges('agent', shouldContinue as any, {
      tools: 'tools',
      [END]: END,
    })
    .addEdge('tools', 'agent');

  // Compile the graph
  const app = workflow.compile();

  return {
    app,
    toolRegistry,
    llm,
  };
}
