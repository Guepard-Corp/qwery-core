'use client';

import { Badge } from '../shadcn/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../shadcn/collapsible';
import { cn } from '../lib/utils';
import type { ToolUIPart } from 'ai';
import {
  BarChart3Icon,
  CheckCircleIcon,
  ChevronDownIcon,
  CircleIcon,
  ClockIcon,
  CodeIcon,
  DatabaseIcon,
  LinkIcon,
  LoaderIcon,
  PlugIcon,
  SheetIcon,
  TableIcon,
  Trash2Icon,
  WrenchIcon,
  XCircleIcon,
} from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { isValidElement } from 'react';
import { CodeBlock } from './code-block';

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn(
      'not-prose mb-4 flex w-full max-w-full flex-col rounded-md border overflow-hidden',
      className,
    )}
    {...props}
  />
);

export type ToolHeaderProps = {
  title?: string;
  type: ToolUIPart['type'];
  state: ToolUIPart['state'];
  className?: string;
};

const getStatusBadge = (status: ToolUIPart['state']) => {
  const labels: Record<string, string> = {
    'input-streaming': 'Pending',
    'input-available': 'Running',
    'approval-requested': 'Awaiting Approval',
    'approval-responded': 'Responded',
    'output-available': 'Completed',
    'output-error': 'Error',
    'output-denied': 'Denied',
  };
  return labels[status] ?? status;
};

const getUserFriendlyToolName = (type: string): string => {
  const nameMap: Record<string, string> = {
    'tool-testConnection': 'Test Connection',
    'tool-runQuery': 'Run Query',
    'tool-getTableSchema': 'Get Table Schema',
    'tool-generateChart': 'Generate Chart',
    'tool-selectChartType': 'Select Chart Type',
    'tool-listAvailableSheets': 'List Available Sheets',
    'tool-viewSheet': 'View Sheet',
    'tool-deleteSheet': 'Delete Sheet',
    'tool-readLinkData': 'Read Link Data',
    'tool-api_call': 'API Call',
  };

  if (nameMap[type]) {
    return nameMap[type] as string;
  }

  // Convert camelCase or kebab-case to Title Case
  return type
    .replace('tool-', '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/-/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const getStatusConfig = (status: ToolUIPart['state']) => {
  const configs: Record<
    string,
    {
      label: string;
      icon: ReactNode;
      variant: 'default' | 'secondary' | 'destructive' | 'outline';
      className: string;
      loadingText?: string;
    }
  > = {
    'input-streaming': {
      label: 'Pending',
      icon: <CircleIcon className="size-3" />,
      variant: 'secondary',
      className: 'bg-muted text-muted-foreground',
      loadingText: 'Generating response...',
    },
    'input-available': {
      label: 'Processing',
      icon: <LoaderIcon className="size-3 animate-spin" />,
      variant: 'default',
      className: 'bg-primary/10 text-primary border-primary/20',
      loadingText: 'Generating response...',
    },
    'approval-requested': {
      label: 'Awaiting Approval',
      icon: <ClockIcon className="size-3" />,
      variant: 'outline',
      className: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-500 dark:border-yellow-800',
    },
    'approval-responded': {
      label: 'Responded',
      icon: <CheckCircleIcon className="size-3" />,
      variant: 'default',
      className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-500 dark:border-blue-800',
    },
    'output-available': {
      label: 'Completed',
      icon: <CheckCircleIcon className="size-3" />,
      variant: 'default',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-500 dark:border-emerald-800',
    },
    'output-error': {
      label: 'Error',
      icon: <XCircleIcon className="size-3" />,
      variant: 'destructive',
      className: 'bg-destructive/10 text-destructive border-destructive/20',
    },
    'output-denied': {
      label: 'Denied',
      icon: <XCircleIcon className="size-3" />,
      variant: 'outline',
      className: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-500 dark:border-orange-800',
    },
  };

  return (
    configs[status] ?? {
      label: status,
      icon: <CircleIcon className="size-3" />,
      variant: 'secondary',
      className: 'bg-muted text-muted-foreground',
    }
  );
};

const getToolIcon = (type: string) => {
  const iconMap: Record<string, ReactNode> = {
    'tool-testConnection': <PlugIcon className="size-4" />,
    'tool-runQuery': <DatabaseIcon className="size-4" />,
    'tool-getTableSchema': <TableIcon className="size-4" />,
    'tool-generateChart': <BarChart3Icon className="size-4" />,
    'tool-selectChartType': <BarChart3Icon className="size-4" />,
    'tool-listAvailableSheets': <SheetIcon className="size-4" />,
    'tool-viewSheet': <SheetIcon className="size-4" />,
    'tool-deleteSheet': <Trash2Icon className="size-4" />,
    'tool-readLinkData': <LinkIcon className="size-4" />,
    'tool-api_call': <CodeIcon className="size-4" />,
  };

  return iconMap[type] ?? <WrenchIcon className="size-4" />;
};

export const ToolHeader = ({
  className,
  title,
  type,
  state,
  ...props
}: ToolHeaderProps) => (
    <CollapsibleTrigger
      className={cn(
      'sticky top-0 z-10 flex w-full items-center justify-between gap-4 border-b bg-background p-3',
        className,
      )}
      {...props}
    >
    <div className="flex items-center gap-2">
      <WrenchIcon className="text-muted-foreground size-4" />
      <span className="text-sm font-medium">
        {title ?? type.split('-').slice(1).join('-')}
      </span>
      {getStatusBadge(state)}
        </div>
    <ChevronDownIcon className="text-muted-foreground size-4 transition-transform group-data-[state=open]:rotate-180" />
    </CollapsibleTrigger>
  );

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      'data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground data-[state=closed]:animate-out data-[state=open]:animate-in outline-none',
      className,
    )}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<'div'> & {
  input: ToolUIPart['input'];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
    <div
      className={cn('min-w-0 space-y-2 overflow-hidden p-4', className)}
      {...props}
    >
    <h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Parameters
        </h4>
    <div className="bg-muted/50 max-w-full min-w-0 overflow-hidden rounded-md">
      <CodeBlock code={JSON.stringify(input, null, 2)} language="json" />
        </div>
    </div>
  );

export type ToolOutputProps = ComponentProps<'div'> & {
  output: ToolUIPart['output'];
  errorText: ToolUIPart['errorText'];
  isTestConnection?: boolean;
};

export const ToolOutput = ({
  className,
  output,
  errorText,
  isTestConnection = false,
  ...props
}: ToolOutputProps) => {
  if (!(output || errorText)) {
    return null;
  }

  // Special handling for testConnection tool
  if (isTestConnection && !errorText) {
    const result = output === true || output === 'true' || String(output).toLowerCase() === 'true';
    return (
      <div className={cn('min-w-0 p-5', className)} {...props}>
        <div className="flex items-center gap-3">
          {result ? (
            <>
              <CheckCircleIcon className="size-5 text-emerald-600 shrink-0" />
              <span className="text-sm font-medium text-emerald-600">
                Connection successful
              </span>
            </>
          ) : (
            <>
              <XCircleIcon className="size-5 text-destructive shrink-0" />
              <span className="text-sm font-medium text-destructive">
                Connection failed
              </span>
            </>
          )}
        </div>
      </div>
    );
  }

  let Output = <div>{output as ReactNode}</div>;

  if (typeof output === 'object' && !isValidElement(output)) {
    Output = (
      <CodeBlock code={JSON.stringify(output, null, 2)} language="json" />
    );
  } else if (typeof output === 'string') {
    Output = <CodeBlock code={output} language="json" />;
  }

  if (errorText) {
    return (
      <div className={cn('min-w-0 space-y-2 p-4', className)} {...props}>
        <h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Error
        </h4>
        <div className="bg-destructive/10 border-destructive/20 max-w-full min-w-0 rounded-md border p-4">
          <div className="flex items-start gap-2">
          <XCircleIcon className="text-destructive mt-0.5 size-4 shrink-0" />
          <div className="min-w-0 flex-1">
              <pre className="text-destructive m-0 font-sans text-sm wrap-break-word whitespace-pre-wrap">
              {errorText}
            </pre>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('min-w-0 space-y-2 p-4', className)} {...props}>
      <h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Result
        </h4>
      <div className="bg-muted/50 max-w-full min-w-0 overflow-hidden rounded-md">
        {Output}
      </div>
    </div>
  );
};


