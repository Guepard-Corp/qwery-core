import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
    Conversation,
    ConversationContent,
    ConversationScrollButton,
} from './conversation';
import {
    Message,
    MessageContent,
    MessageResponse,
    MessageActions,
    MessageAction,
} from './message';
import {
    Tool,
    ToolHeader,
    ToolContent,
    ToolInput,
    ToolOutput,
} from './tool';
import {
    Reasoning,
    ReasoningTrigger,
    ReasoningContent,
} from './reasoning';
import {
    Plan,
    PlanHeader,
    PlanTitle,
    PlanDescription,
    PlanContent,
    PlanTrigger,
} from './plan';
import {
    Task,
    TaskTrigger,
    TaskContent,
    TaskItem,
} from './task';
import { CodeBlock, CodeBlockCopyButton } from './code-block';
import { Artifact, ArtifactHeader, ArtifactTitle, ArtifactContent } from './artifact';
import { Loader } from './loader';
import { CopyIcon, RefreshCcwIcon, PencilIcon } from 'lucide-react';
import {
    PromptInput,
    PromptInputProvider,
    PromptInputBody,
    PromptInputTextarea,
    PromptInputFooter,
    PromptInputSubmit,
} from './prompt-input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../shadcn/table';
import { ScrollArea } from '../shadcn/scroll-area';
import { cn } from '../lib/utils';

// Type definition matching DatasourceResultSet structure
interface DatasourceResultSet {
    headers: Array<{
        name: string;
        displayName?: string;
        originalType?: string | null;
    }>;
    rows: Array<Record<string, unknown>>;
    stat: {
        rowsAffected: number;
        rowsRead: number | null;
        rowsWritten: number | null;
        queryDurationMs: number | null;
    };
}

const meta: Meta = {
    title: 'AI Elements/Workflows/SQL Generation',
    parameters: {
        layout: 'fullscreen',
    },
};

export default meta;
type Story = StoryObj;

// Helper component to display SQL query input
function SQLQueryInput({ input }: { input: unknown }) {
    const query =
        typeof input === 'object' &&
            input !== null &&
            'query' in input &&
            typeof input.query === 'string'
            ? input.query
            : null;

    if (query) {
        return (
            <div className="space-y-2 overflow-hidden p-4">
                <h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    SQL Query
                </h4>
                <div className="bg-muted/50 rounded-md">
                    <CodeBlock code={query} language="sql" showLineNumbers={true}>
                        <CodeBlockCopyButton />
                    </CodeBlock>
                </div>
            </div>
        );
    }

    // Fallback to default ToolInput for non-SQL inputs
    return <ToolInput input={input} />;
}

// Helper component to display query results as a table
function QueryResultTable({
    output,
    errorText,
}: {
    output: unknown;
    errorText?: string;
}) {
    if (errorText) {
        return (
            <div className="space-y-2 p-4">
                <h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Error
                </h4>
                <div className="bg-destructive/10 text-destructive overflow-x-auto rounded-md p-4 text-sm">
                    <pre className="whitespace-pre-wrap">{errorText}</pre>
                </div>
            </div>
        );
    }

    // Check if output is a DatasourceResultSet
    const resultSet = output as DatasourceResultSet | null;
    if (
        resultSet &&
        typeof resultSet === 'object' &&
        'headers' in resultSet &&
        'rows' in resultSet &&
        Array.isArray(resultSet.headers) &&
        Array.isArray(resultSet.rows)
    ) {
        const { headers, rows, stat } = resultSet;
        const displayedRows = rows.length;
        const totalRows = stat?.rowsRead ?? displayedRows;
        const duration = stat?.queryDurationMs
            ? stat.queryDurationMs < 1000
                ? `${stat.queryDurationMs}ms`
                : `${(stat.queryDurationMs / 1000).toFixed(1)}s`
            : 'N/A';

        const formatValue = (value: unknown): string => {
            if (value === null || value === undefined) return 'NULL';
            if (typeof value === 'string') return value;
            if (typeof value === 'number') return value.toString();
            if (typeof value === 'boolean') return value ? 'true' : 'false';
            if (value instanceof Date) return value.toISOString();
            return String(value);
        };

        return (
            <div className="space-y-2 p-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                        Result
                    </h4>
                    <span className="text-muted-foreground text-xs">
                        {displayedRows.toLocaleString()} of {totalRows.toLocaleString()} rows
                        in {duration}
                    </span>
                </div>
                <div className="bg-muted/50 overflow-hidden rounded-md">
                    <ScrollArea className="max-h-[400px]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">#</TableHead>
                                    {headers.map((header) => (
                                        <TableHead key={header.name}>
                                            {header.displayName || header.name}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={headers.length + 1}
                                            className="text-muted-foreground py-8 text-center"
                                        >
                                            No rows returned
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    rows.map((row, rowIndex) => (
                                        <TableRow key={rowIndex} className="hover:bg-muted/50">
                                            <TableCell className="text-muted-foreground w-12 text-xs tabular-nums">
                                                {rowIndex + 1}
                                            </TableCell>
                                            {headers.map((header) => {
                                                const value = row[header.name];
                                                const isNull = value === null || value === undefined;
                                                return (
                                                    <TableCell
                                                        key={header.name}
                                                        className={cn(
                                                            'max-w-[300px]',
                                                            isNull && 'text-muted-foreground italic',
                                                        )}
                                                        title={isNull ? 'NULL' : formatValue(value)}
                                                    >
                                                        <div className="truncate" title={formatValue(value)}>
                                                            {isNull ? 'NULL' : formatValue(value)}
                                                        </div>
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
            </div>
        );
    }

    // Fallback to default ToolOutput for non-table outputs
    return <ToolOutput output={output} errorText={errorText} />;
}

// Mock SQL query result matching DatasourceResultSet structure
const mockQueryResult = {
    headers: [
        { name: 'id', displayName: 'id', originalType: 'integer' },
        { name: 'name', displayName: 'name', originalType: 'varchar' },
        { name: 'email', displayName: 'email', originalType: 'varchar' },
        { name: 'created_at', displayName: 'created_at', originalType: 'timestamp' },
    ],
    rows: [
        { id: 1, name: 'John Doe', email: 'john@example.com', created_at: '2024-01-15' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', created_at: '2024-01-16' },
        { id: 3, name: 'Bob Johnson', email: 'bob@example.com', created_at: '2024-01-17' },
    ],
    stat: {
        rowsAffected: 3,
        rowsRead: 3,
        rowsWritten: null,
        queryDurationMs: 45,
    },
};

export const SimpleTextToSQL: Story = {
    render: () => {
        return (
            <div className="h-screen w-full max-w-4xl mx-auto p-4">
                <Conversation>
                    <ConversationContent>
                        <Message from="user">
                            <MessageContent>
                                <MessageResponse>
                                    Show me all users from the users table
                                </MessageResponse>
                            </MessageContent>
                        </Message>
                        <Message from="assistant">
                            <MessageContent>
                                <MessageResponse>
                                    I'll generate a SQL query to retrieve all users from the users table.
                                </MessageResponse>
                            </MessageContent>
                        </Message>
                        <Tool defaultOpen={true}>
                            <ToolHeader
                                title="execute_query"
                                type="tool-execute_query"
                                state="output-available"
                            />
                            <ToolContent>
                                <SQLQueryInput
                                    input={{
                                        query: 'SELECT * FROM users;',
                                    }}
                                />
                                <QueryResultTable output={mockQueryResult} errorText={undefined} />
                            </ToolContent>
                        </Tool>
                    </ConversationContent>
                    <ConversationScrollButton />
                </Conversation>
            </div>
        );
    },
};

export const SQLGenerationWithReasoning: Story = {
    render: () => {
        return (
            <div className="h-screen w-full max-w-4xl mx-auto p-4">
                <Conversation>
                    <ConversationContent>
                        <Message from="user">
                            <MessageContent>
                                <MessageResponse>
                                    Find the top 5 customers by total order value
                                </MessageResponse>
                            </MessageContent>
                        </Message>
                        <Message from="assistant">
                            <MessageContent>
                                <MessageResponse>
                                    I need to analyze the requirements and generate an appropriate SQL query.
                                </MessageResponse>
                            </MessageContent>
                        </Message>
                        <Reasoning defaultOpen={true}>
                            <ReasoningTrigger />
                            <ReasoningContent>
                                {`To find the top 5 customers by total order value, I need to:
1. Join the customers and orders tables
2. Calculate the total order value per customer using SUM
3. Group by customer
4. Order by total value descending
5. Limit to top 5 results`}
                            </ReasoningContent>
                        </Reasoning>
                    </ConversationContent>
                    <ConversationScrollButton />
                </Conversation>
            </div>
        );
    },
};

export const SQLWithErrorHandling: Story = {
    render: () => {
        return (
            <div className="h-screen w-full max-w-4xl mx-auto p-4">
                <Conversation>
                    <ConversationContent>
                        <Message from="user">
                            <MessageContent>
                                <MessageResponse>
                                    Get all products with price greater than 100
                                </MessageResponse>
                            </MessageContent>
                        </Message>
                        <Message from="assistant">
                            <MessageContent>
                                <MessageResponse>
                                    I'll generate a SQL query to find products with price greater than 100.
                                </MessageResponse>
                            </MessageContent>
                            <MessageActions>
                                <MessageAction tooltip="Copy" label="Copy">
                                    <CopyIcon className="size-3" />
                                </MessageAction>
                            </MessageActions>
                        </Message>
                        <Tool defaultOpen={true}>
                            <ToolHeader
                                title="execute_query"
                                type="tool-execute_query"
                                state="output-error"
                            />
                            <ToolContent>
                                <SQLQueryInput
                                    input={{
                                        query: 'SELECT * FROM products WHERE price > 100;',
                                    }}
                                />
                                <QueryResultTable
                                    output={null}
                                    errorText="ERROR: column 'price' does not exist\nHINT: Perhaps you meant 'unit_price'."
                                />
                            </ToolContent>
                        </Tool>
                        <Message from="assistant">
                            <MessageContent>
                                <MessageResponse>
                                    I see the error - the column is named 'unit_price', not 'price'. Let me fix the query.
                                </MessageResponse>
                            </MessageContent>
                        </Message>
                        <Tool defaultOpen={false}>
                            <ToolHeader
                                title="execute_query"
                                type="tool-execute_query"
                                state="output-available"
                            />
                            <ToolContent>
                                <SQLQueryInput
                                    input={{
                                        query: 'SELECT * FROM products WHERE unit_price > 100;',
                                    }}
                                />
                                <QueryResultTable
                                    output={{
                                        headers: [
                                            { name: 'id', displayName: 'id', originalType: 'integer' },
                                            { name: 'name', displayName: 'name', originalType: 'varchar' },
                                            { name: 'unit_price', displayName: 'unit_price', originalType: 'decimal' },
                                        ],
                                        rows: [
                                            { id: 1, name: 'Product A', unit_price: 150.0 },
                                            { id: 2, name: 'Product B', unit_price: 200.0 },
                                        ],
                                        stat: {
                                            rowsAffected: 2,
                                            rowsRead: 2,
                                            rowsWritten: null,
                                            queryDurationMs: 32,
                                        },
                                    }}
                                    errorText={undefined}
                                />
                            </ToolContent>
                        </Tool>
                    </ConversationContent>
                    <ConversationScrollButton />
                </Conversation>
            </div>
        );
    },
};

export const SQLArtifactGeneration: Story = {
    render: () => {
        const [input, setInput] = React.useState('Generate a SQL query for monthly sales report with YoY comparison');
        const [isThinking, setIsThinking] = React.useState(false);
        const [isStreaming, setIsStreaming] = React.useState(false);
        const [streamedSQL, setStreamedSQL] = React.useState('');
        const [streamedMessage, setStreamedMessage] = React.useState('');
        const [showArtifact, setShowArtifact] = React.useState(false);
        const [showMessage, setShowMessage] = React.useState(false);
        const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
        const thinkingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

        const fullSQL = `WITH monthly_sales AS (
  SELECT 
    c.name AS category,
    EXTRACT(YEAR FROM s.sale_date) AS year,
    EXTRACT(MONTH FROM s.sale_date) AS month,
    SUM(s.amount) AS total_sales
  FROM sales s
  JOIN products p ON s.product_id = p.id
  JOIN categories c ON p.category_id = c.id
  GROUP BY c.name, EXTRACT(YEAR FROM s.sale_date), EXTRACT(MONTH FROM s.sale_date)
),
yoy_comparison AS (
  SELECT 
    category,
    year,
    month,
    total_sales,
    LAG(total_sales, 12) OVER (
      PARTITION BY category, month 
      ORDER BY year, month
    ) AS previous_year_sales,
    total_sales - LAG(total_sales, 12) OVER (
      PARTITION BY category, month 
      ORDER BY year, month
    ) AS yoy_change
  FROM monthly_sales
)
SELECT 
  category,
  year,
  month,
  total_sales,
  previous_year_sales,
  yoy_change,
  ROUND(
    (yoy_change / NULLIF(previous_year_sales, 0)) * 100, 
    2
  ) AS yoy_change_percent
FROM yoy_comparison
ORDER BY category, year DESC, month DESC;`;

        const fullResponseText =
            "I've generated a comprehensive SQL query for your monthly sales report with year-over-year comparison.";

        const handleSubmit = () => {
            setIsThinking(true);
            setStreamedSQL('');
            setStreamedMessage('');
            setShowArtifact(false);
            setShowMessage(false);
            setIsStreaming(false);

            // Clear any existing timeouts/intervals
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            if (thinkingTimeoutRef.current) {
                clearTimeout(thinkingTimeoutRef.current);
            }

            // Simulate thinking phase (1-2 seconds)
            const thinkingDuration = 1500 + Math.random() * 500;
            thinkingTimeoutRef.current = setTimeout(() => {
                setIsThinking(false);
                setShowMessage(true);
                setShowArtifact(true);
                setIsStreaming(true);
                let messageIndex = 0;
                let sqlIndex = 0;

                // Start streaming SQL code and response text after thinking
                intervalRef.current = setInterval(() => {
                    if (messageIndex < fullResponseText.length) {
                        messageIndex += 1;
                        setStreamedMessage(
                            fullResponseText.slice(0, Math.min(messageIndex, fullResponseText.length)),
                        );
                    }

                    if (sqlIndex < fullSQL.length) {
                        const chunkSize = Math.floor(Math.random() * 3) + 1;
                        sqlIndex = Math.min(sqlIndex + chunkSize, fullSQL.length);
                        setStreamedSQL(fullSQL.slice(0, sqlIndex));
                    } else {
                        if (intervalRef.current) {
                            clearInterval(intervalRef.current);
                            intervalRef.current = null;
                        }
                        setStreamedMessage(fullResponseText);
                        setIsStreaming(false);
                        return;
                    }
                }, 30); // Update every 30ms for smooth streaming
            }, thinkingDuration);
        };

        // Cleanup on unmount
        React.useEffect(() => {
            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
                if (thinkingTimeoutRef.current) {
                    clearTimeout(thinkingTimeoutRef.current);
                }
            };
        }, []);

        return (
            <div className="h-screen w-full max-w-4xl mx-auto p-4 flex flex-col">
                <PromptInputProvider>
                    <Conversation className="flex-1">
                        <ConversationContent>
                            <Message from="user">
                                <MessageContent>
                                    <MessageResponse>
                                        Generate a SQL query for monthly sales report with YoY comparison
                                    </MessageResponse>
                                </MessageContent>
                            </Message>
                            {isThinking && (
                                <>
                                    <Message from="assistant">
                                        <MessageContent>
                                            <MessageResponse>
                                                I'll generate a comprehensive SQL query for your monthly sales
                                                report with year-over-year comparison.
                                            </MessageResponse>
                                        </MessageContent>
                                    </Message>
                                    <Loader />
                                    <Reasoning defaultOpen={true} isStreaming={true}>
                                        <ReasoningTrigger />
                                        <ReasoningContent>
                                            {`I need to:
1. Calculate monthly sales totals by category
2. Use window functions to compare with previous year
3. Calculate year-over-year change and percentage
4. Structure the query with CTEs for clarity`}
                                        </ReasoningContent>
                                    </Reasoning>
                                </>
                            )}
                            {showMessage && (
                                <>
                                    <Message from="assistant">
                                        <MessageContent>
                                            <MessageResponse>
                                                {(isStreaming && streamedMessage) || fullResponseText}
                                            </MessageResponse>
                                        </MessageContent>
                                    </Message>
                                    <Artifact>
                                        <ArtifactHeader>
                                            <div>
                                                <ArtifactTitle>Monthly Sales Report Query</ArtifactTitle>
                                            </div>
                                        </ArtifactHeader>
                                        <ArtifactContent>
                                            {isStreaming ? (
                                                <CodeBlock
                                                    code={streamedSQL}
                                                    language="sql"
                                                    showLineNumbers={true}
                                                />
                                            ) : (
                                                <CodeBlock
                                                    code={fullSQL}
                                                    language="sql"
                                                    showLineNumbers={true}
                                                >
                                                    <CodeBlockCopyButton />
                                                </CodeBlock>
                                            )}
                                        </ArtifactContent>
                                    </Artifact>
                                </>
                            )}
                        </ConversationContent>
                        <ConversationScrollButton />
                    </Conversation>
                    <div className="mt-4">
                        <PromptInput onSubmit={handleSubmit}>
                            <PromptInputBody>
                                <PromptInputTextarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask for a SQL query..."
                                />
                            </PromptInputBody>
                            <PromptInputFooter>
                                <PromptInputSubmit
                                    disabled={!input.trim() || isThinking || isStreaming}
                                    status={isThinking || isStreaming ? 'submitted' : undefined}
                                />
                            </PromptInputFooter>
                        </PromptInput>
                    </div>
                </PromptInputProvider>
            </div>
        );
    },
};

export const MultiStepSQLWorkflow: Story = {
    render: () => {
        return (
            <div className="h-screen w-full max-w-4xl mx-auto p-4">
                <Conversation>
                    <ConversationContent>
                        <Message from="user">
                            <MessageContent>
                                <MessageResponse>
                                    Help me analyze customer churn by identifying customers who
                                    haven't placed an order in the last 90 days
                                </MessageResponse>
                            </MessageContent>
                        </Message>
                        <Message from="assistant">
                            <MessageContent>
                                <MessageResponse>
                                    I'll help you identify churned customers. Let me break this down
                                    into steps.
                                </MessageResponse>
                            </MessageContent>
                        </Message>
                        <Reasoning defaultOpen={true}>
                            <ReasoningTrigger />
                            <ReasoningContent>
                                {`To identify churned customers:
1. I need to find all customers
2. Check their last order date
3. Compare with current date minus 90 days
4. Filter customers with no orders in that period`}
                            </ReasoningContent>
                        </Reasoning>
                        <Message from="assistant">
                            <MessageContent>
                                <MessageResponse>
                                    Now I'll generate the SQL query to find these customers.
                                </MessageResponse>
                            </MessageContent>
                        </Message>
                        <Tool defaultOpen={true}>
                            <ToolHeader
                                title="execute_query"
                                type="tool-execute_query"
                                state="output-available"
                            />
                            <ToolContent>
                                <SQLQueryInput
                                    input={{
                                        query: `SELECT 
  c.id,
  c.name,
  c.email,
  MAX(o.order_date) AS last_order_date,
  CURRENT_DATE - MAX(o.order_date) AS days_since_last_order
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
GROUP BY c.id, c.name, c.email
HAVING MAX(o.order_date) IS NULL 
   OR MAX(o.order_date) < CURRENT_DATE - INTERVAL '90 days'
ORDER BY days_since_last_order DESC NULLS LAST;`,
                                    }}
                                />
                                <QueryResultTable
                                    output={{
                                        headers: [
                                            { name: 'id', displayName: 'id', originalType: 'integer' },
                                            { name: 'name', displayName: 'name', originalType: 'varchar' },
                                            { name: 'email', displayName: 'email', originalType: 'varchar' },
                                            { name: 'last_order_date', displayName: 'last_order_date', originalType: 'date' },
                                            { name: 'days_since_last_order', displayName: 'days_since_last_order', originalType: 'integer' },
                                        ],
                                        rows: [
                                            {
                                                id: 101,
                                                name: 'Alice Brown',
                                                email: 'alice@example.com',
                                                last_order_date: '2024-01-10',
                                                days_since_last_order: 95,
                                            },
                                            {
                                                id: 102,
                                                name: 'Charlie Davis',
                                                email: 'charlie@example.com',
                                                last_order_date: null,
                                                days_since_last_order: null,
                                            },
                                        ],
                                        stat: {
                                            rowsAffected: 2,
                                            rowsRead: 2,
                                            rowsWritten: null,
                                            queryDurationMs: 67,
                                        },
                                    }}
                                    errorText={undefined}
                                />
                            </ToolContent>
                        </Tool>
                    </ConversationContent>
                    <ConversationScrollButton />
                </Conversation>
            </div>
        );
    },
};

export const SQLQueryRefinement: Story = {
    render: () => {
        return (
            <div className="h-screen w-full max-w-4xl mx-auto p-4">
                <Conversation>
                    <ConversationContent>
                        <Message from="user">
                            <MessageContent>
                                <MessageResponse>Get all active users</MessageResponse>
                            </MessageContent>
                        </Message>
                        <Message from="assistant">
                            <MessageContent>
                                <MessageResponse>
                                    I'll query the users table for active users.
                                </MessageResponse>
                            </MessageContent>
                            <MessageActions>
                                <MessageAction tooltip="Regenerate" label="Regenerate">
                                    <RefreshCcwIcon className="size-3" />
                                </MessageAction>
                                <MessageAction tooltip="Copy" label="Copy">
                                    <CopyIcon className="size-3" />
                                </MessageAction>
                            </MessageActions>
                        </Message>
                        <Tool defaultOpen={false}>
                            <ToolHeader
                                title="execute_query"
                                type="tool-execute_query"
                                state="output-available"
                            />
                            <ToolContent>
                                <SQLQueryInput
                                    input={{
                                        query: 'SELECT * FROM users WHERE status = "active";',
                                    }}
                                />
                                <QueryResultTable
                                    output={{
                                        headers: [{ name: 'id', displayName: 'id', originalType: 'integer' }],
                                        rows: [],
                                        stat: {
                                            rowsAffected: 0,
                                            rowsRead: 0,
                                            rowsWritten: null,
                                            queryDurationMs: 12,
                                        },
                                    }}
                                    errorText={undefined}
                                />
                            </ToolContent>
                        </Tool>
                        <Message from="user">
                            <MessageContent>
                                <MessageResponse>
                                    The status column uses boolean, not string. Also include their
                                    email and registration date.
                                </MessageResponse>
                            </MessageContent>
                        </Message>
                        <Message from="assistant">
                            <MessageContent>
                                <MessageResponse>
                                    I'll update the query to use boolean for status and include the
                                    requested fields.
                                </MessageResponse>
                            </MessageContent>
                        </Message>
                        <Tool defaultOpen={true}>
                            <ToolHeader
                                title="execute_query"
                                type="tool-execute_query"
                                state="output-available"
                            />
                            <ToolContent>
                                <SQLQueryInput
                                    input={{
                                        query:
                                            'SELECT id, email, registered_at FROM users WHERE is_active = true;',
                                    }}
                                />
                                <QueryResultTable output={mockQueryResult} errorText={undefined} />
                            </ToolContent>
                        </Tool>
                    </ConversationContent>
                    <ConversationScrollButton />
                </Conversation>
            </div>
        );
    },
};

export const IterativeSQLRefinement: Story = {
    render: () => {
        return (
            <div className="h-screen w-full max-w-4xl mx-auto p-4">
                <Conversation>
                    <ConversationContent>
                        <Message from="user">
                            <MessageContent>
                                <MessageResponse>
                                    Find all orders from the last 30 days with their customer names and total amounts
                                </MessageResponse>
                            </MessageContent>
                            <MessageActions>
                                <MessageAction tooltip="Copy" label="Copy">
                                    <CopyIcon className="size-3" />
                                </MessageAction>
                                <MessageAction tooltip="Edit" label="Edit">
                                    <PencilIcon className="size-3" />
                                </MessageAction>
                            </MessageActions>
                        </Message>
                        <Message from="assistant">
                            <MessageContent>
                                <MessageResponse>
                                    I'll generate a SQL query to find recent orders with customer information.
                                </MessageResponse>
                            </MessageContent>
                        </Message>
                        <Reasoning defaultOpen={true}>
                            <ReasoningTrigger />
                            <ReasoningContent>
                                {`I need to:
1. Join orders and customers tables
2. Filter orders from the last 30 days
3. Include customer names and order totals
4. Use DATE_SUB or INTERVAL for date filtering`}
                            </ReasoningContent>
                        </Reasoning>
                        <Tool defaultOpen={true}>
                            <ToolHeader
                                title="execute_query (v1)"
                                type="tool-execute_query"
                                state="output-error"
                            />
                            <ToolContent>
                                <SQLQueryInput
                                    input={{
                                        query: `SELECT 
  o.id,
  c.name AS customer_name,
  o.total_amount
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.order_date >= DATE_SUB(NOW(), INTERVAL 30 DAY);`,
                                    }}
                                />
                                <QueryResultTable
                                    output={null}
                                    errorText="ERROR: function date_sub(timestamp with time zone, interval) does not exist\nHINT: No function matches the given name and argument types. You might need to add explicit type casts."
                                />
                            </ToolContent>
                        </Tool>
                        <Message from="assistant">
                            <MessageContent>
                                <MessageResponse>
                                    I see the issue - PostgreSQL uses different date functions. Let me use CURRENT_DATE with INTERVAL instead. (v2)
                                </MessageResponse>
                            </MessageContent>
                        </Message>
                        <Tool defaultOpen={true}>
                            <ToolHeader
                                title="execute_query (v2)"
                                type="tool-execute_query"
                                state="output-error"
                            />
                            <ToolContent>
                                <SQLQueryInput
                                    input={{
                                        query: `SELECT 
  o.id,
  c.name AS customer_name,
  o.total_amount
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.order_date >= CURRENT_DATE - INTERVAL '30 days';`,
                                    }}
                                />
                                <QueryResultTable
                                    output={null}
                                    errorText={'ERROR: column "total_amount" does not exist\nHINT: Perhaps you meant "amount" or "order_total".'}
                                />
                            </ToolContent>
                        </Tool>
                        <Message from="assistant">
                            <MessageContent>
                                <MessageResponse>
                                    The column is named 'amount', not 'total_amount'. Let me fix that. (v3)
                                </MessageResponse>
                            </MessageContent>
                        </Message>
                        <Tool defaultOpen={true}>
                            <ToolHeader
                                title="execute_query (v3)"
                                type="tool-execute_query"
                                state="output-error"
                            />
                            <ToolContent>
                                <SQLQueryInput
                                    input={{
                                        query: `SELECT 
  o.id,
  c.name AS customer_name,
  o.amount
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.order_date >= CURRENT_DATE - INTERVAL '30 days';`,
                                    }}
                                />
                                <QueryResultTable
                                    output={null}
                                    errorText={'ERROR: column "order_date" does not exist\nHINT: Perhaps you meant "created_at" or "date".'}
                                />
                            </ToolContent>
                        </Tool>
                        <Message from="assistant">
                            <MessageContent>
                                <MessageResponse>
                                    The date column is 'created_at'. Let me update the query with the correct column name. (v4)
                                </MessageResponse>
                            </MessageContent>
                        </Message>
                        <Tool defaultOpen={true}>
                            <ToolHeader
                                title="execute_query (v4)"
                                type="tool-execute_query"
                                state="output-available"
                            />
                            <ToolContent>
                                <SQLQueryInput
                                    input={{
                                        query: `SELECT 
  o.id,
  c.name AS customer_name,
  o.amount
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.created_at >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY o.created_at DESC;`,
                                    }}
                                />
                                <QueryResultTable
                                    output={{
                                        headers: [
                                            { name: 'id', displayName: 'Order ID', originalType: 'integer' },
                                            { name: 'customer_name', displayName: 'Customer Name', originalType: 'varchar' },
                                            { name: 'amount', displayName: 'Amount', originalType: 'decimal' },
                                        ],
                                        rows: [
                                            {
                                                id: 1001,
                                                customer_name: 'John Doe',
                                                amount: 299.99,
                                            },
                                            {
                                                id: 1002,
                                                customer_name: 'Jane Smith',
                                                amount: 149.50,
                                            },
                                            {
                                                id: 1003,
                                                customer_name: 'Bob Johnson',
                                                amount: 89.99,
                                            },
                                            {
                                                id: 1004,
                                                customer_name: 'Alice Brown',
                                                amount: 450.00,
                                            },
                                            {
                                                id: 1005,
                                                customer_name: 'John Doe',
                                                amount: 199.99,
                                            },
                                        ],
                                        stat: {
                                            rowsAffected: 5,
                                            rowsRead: 5,
                                            rowsWritten: null,
                                            queryDurationMs: 45,
                                        },
                                    }}
                                    errorText={undefined}
                                />
                            </ToolContent>
                        </Tool>
                        <Message from="assistant">
                            <MessageContent>
                                <MessageResponse>
                                    Perfect! The query is now working correctly. I found 5 orders from the last 30 days with customer names and amounts, sorted by most recent first.
                                </MessageResponse>
                            </MessageContent>
                            <MessageActions>
                                <MessageAction tooltip="Copy" label="Copy">
                                    <CopyIcon className="size-3" />
                                </MessageAction>
                                <MessageAction tooltip="Regenerate" label="Regenerate">
                                    <RefreshCcwIcon className="size-3" />
                                </MessageAction>
                            </MessageActions>
                        </Message>
                    </ConversationContent>
                    <ConversationScrollButton />
                </Conversation>
            </div>
        );
    },
};

