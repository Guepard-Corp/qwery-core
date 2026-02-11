import type { AgentInfoWithId } from '../../agents/agent';

export const TaskPrompt = (
  agents: AgentInfoWithId[],
) => `Launch a new agent to handle complex, multistep data tasks autonomously.

Available agent types and the tools they have access to:
${agents.map((a) => `- ${a.id}: ${a.description ?? 'This subagent should only be called manually by the user.'}`).join('\n')}

When using the Task tool, you must specify a subagent_type parameter to select which agent type to use.

When to use the Task tool:
- When the user asks for a multi-step data workflow that benefits from delegation (e.g. explore schema → generate SQL → run query → suggest chart type)
- When a skill from get_skill requires a focused sub-agent to execute its instructions end-to-end
- When the task combines data querying with external research (WebFetch) or complex analysis that fits a specialized agent

When NOT to use the Task tool:
- For simple schema inspection or listing tables: use GetSchema instead
- For running a single SQL query you already have: use RunQuery instead
- For loading skill instructions: use GetSkill instead
- For straightforward natural language questions: use the main agent with its tools directly
- Other tasks that are not related to the agent descriptions above

Usage notes:
1. Launch multiple agents concurrently whenever possible, to maximize performance; use a single message with multiple tool uses
2. When the agent is done, it will return a single message back to you. The result returned by the agent is not visible to the user. To show the user the result, send a text message back with a concise summary of the result.
3. Each agent invocation is stateless unless you provide a session_id. Your prompt should contain a detailed task description and specify exactly what information the agent should return.
4. The agent's outputs should generally be trusted.
5. Clearly tell the agent whether you expect it to run queries, generate charts, apply a skill, or do research, since it is not aware of the user's intent.
6. If the agent description mentions that it should be used proactively, use it without the user having to ask first. Use your judgement.

Example usage (use the actual agents listed above):

<example_agent_descriptions>
"ask": general-purpose agent for questions and conversational assistance
"query": data and query-focused agent for executing and analyzing data
</example_agent_descriptions>

<example>
user: "Explore the customers table, find top 10 by revenue, and suggest the best chart for it"
assistant: I'll delegate this to the query agent to explore the schema, run the analysis, and suggest a chart type.
assistant: Uses the Task tool with subagent_type="query", prompt="1. Get schema for customers table. 2. Write and run a query for top 10 customers by revenue. 3. Suggest the best chart type for the result. Return a concise summary with the query, top results, and chart recommendation."
</example>

<example>
user: "Apply the DuckDB best-practices skill to optimize this query: SELECT * FROM sales"
assistant: I'll load the skill and use the query agent to apply those practices.
assistant: First uses GetSkill to load the DuckDB skill, then uses the Task tool with subagent_type="query" and a prompt that includes the skill content and the query to optimize.
</example>`;
