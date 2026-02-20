import type { ToolInfo } from '../tool';

export const TODOWRITE_BASE_DESCRIPTION = `Use this tool to create and manage a structured task list for your current coding session. This helps you track progress, organize complex tasks, and demonstrate thoroughness to the user.
It also helps the user understand the progress of the task and overall progress of their requests.

## When to Use This Tool
Use this tool proactively in these scenarios:

1. Complex multistep tasks - When a task requires 3 or more distinct steps or actions
2. Non-trivial and complex tasks - Tasks that require careful planning or multiple operations
3. User explicitly requests todo list - When the user directly asks you to use the todo list
4. User provides multiple tasks - When users provide a list of things to be done (numbered or comma-separated)
5. After receiving new instructions - Immediately capture user requirements as todos. Feel free to edit the todo list based on new information.
6. After completing a task - Mark it complete and add any new follow-up tasks
7. When you start working on a new task, mark the todo as in_progress. Ideally you should only have one todo as in_progress at a time. Complete existing tasks before starting new ones.

## When NOT to Use This Tool

Skip using this tool when:
1. There is only a single, straightforward task
2. The task is trivial and tracking it provides no organizational benefit
3. The task can be completed in less than 3 trivial steps
4. The task is purely conversational or informational

NOTE that you should not use this tool if there is only one trivial task to do. In this case you are better off just doing the task directly.

## Task States and Management

1. **Task States**: Use these states to track progress:
   - pending: Task not yet started
   - in_progress: Currently working on (limit to ONE task at a time)
   - completed: Task finished successfully
   - cancelled: Task no longer needed

2. **Task Management**:
   - Update task status in real-time as you work
   - Mark tasks complete IMMEDIATELY after finishing (don't batch completions)
   - Only have ONE task in_progress at any time
   - Complete current tasks before starting new ones
   - Cancel tasks that become irrelevant

3. **Task Breakdown**:
   - Create specific, actionable items
   - Break complex tasks into smaller, manageable steps
   - Use clear, descriptive task names

When in doubt, use this tool. Being proactive with task management demonstrates attentiveness and ensures you complete all requirements successfully.

## Examples of When to Use the Todo List

<example>
User: Compare revenue across regions and build a chart, then suggest follow-up queries.
Assistant: I'll compare revenue by region, build a chart, and suggest follow-ups. Let me create a todo list to track this.
*Creates todo list: 1) Run comparison query for revenue by region, 2) Build chart from results, 3) Suggest follow-up queries*
*Begins working on the first task*

<reasoning>
The assistant used the todo list because the request has three distinct steps: run a query, build a chart, and suggest follow-ups. A todo list ensures all steps are completed and the user sees progress.
</reasoning>
</example>

<example>
User: I need to validate these 5 tables for data quality: customers, orders, products, inventory, and shipments.
Assistant: I'll validate each table for data quality. Let me create a todo list for the five tables.
*Creates todo list with one item per table*
*Starts with the first table*

<reasoning>
The user provided multiple items (5 tables). The todo list helps track validation across each table and prevents missing any.
</reasoning>
</example>

<example>
User: Can you run a cohort analysis, then build a line chart and a bar chart, and summarize the findings?
Assistant: I'll run the cohort analysis, create both charts, and summarize. Let me plan this with a todo list.
*Creates todo list: 1) Run cohort analysis query, 2) Build line chart, 3) Build bar chart, 4) Summarize findings*
*Begins with the cohort query*

<reasoning>
The request involves multiple analyses and multiple charts plus a summary. A todo list organizes the work and gives the user visibility into progress.
</reasoning>
</example>

## Examples of When NOT to Use the Todo List

<example>
User: What's the total sales?
Assistant: *Runs a single query for total sales and returns the result*

<reasoning>
The assistant did not use the todo list because this is a single, straightforward question that requires one query. No multi-step tracking is needed.
</reasoning>
</example>

<example>
User: How do I attach a datasource?
Assistant: To attach a datasource, go to your conversation settings and select the datasource you want to connect. You can connect PostgreSQL, DuckDB, Google Sheets, and more.

<reasoning>
The assistant did not use the todo list because this is an informational request. The user is asking for instructions, not for multiple steps to be executed.
</reasoning>
</example>

<example>
User: Show me the top 10 customers by revenue.
Assistant: *Runs one query and returns the table or chart*

<reasoning>
The assistant did not use the todo list because this is a single query request. One tool call is sufficient.
</reasoning>
</example>`;

export function TodoWritePrompt(availableTools: ToolInfo[]): string {
  const toolList = availableTools
    .filter((tool) => {
      // Only include tools with static descriptions (exclude async tools like task/todowrite)
      return 'description' in tool && typeof tool.description === 'string';
    })
    .map((tool) => {
      const toolWithDesc = tool as ToolInfo & { description: string };
      return `- ${tool.id}: ${toolWithDesc.description}`;
    })
    .join('\n');

  const capabilitiesSection = toolList
    ? `## Available Capabilities

You can ONLY propose actions using these tools:
${toolList}

**CRITICAL**: Only create todo items for actions you can actually complete with the above tools.
Do NOT propose: CSV/PDF export, file operations, or any action without a corresponding tool.`
    : `## Available Capabilities

**CRITICAL**: Only create todo items for actions you can actually complete with available tools.
Do NOT propose: CSV/PDF export, file operations, or any action without a corresponding tool.`;

  return `${TODOWRITE_BASE_DESCRIPTION}

${capabilitiesSection}`;
}
