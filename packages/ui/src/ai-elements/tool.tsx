'use client';

import { Badge } from '../shadcn/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../shadcn/collapsible';
import { cn } from '../lib/utils';
import type { ToolUIPart } from 'ai';
import { getUserFriendlyToolName } from '../qwery/ai/utils/tool-name';
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
      'not-prose mb-4 flex w-full min-w-0 flex-col overflow-hidden rounded-md border',
      className,
    )}
    style={{ boxSizing: 'border-box' }}
    {...props}
  />
);

export type ToolHeaderProps = {
  title?: string;
  type: ToolUIPart['type'];
  state: ToolUIPart['state'];
  className?: string;
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
      className:
        'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-500 dark:border-yellow-800',
    },
    'approval-responded': {
      label: 'Responded',
      icon: <CheckCircleIcon className="size-3" />,
      variant: 'default',
      className:
        'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-500 dark:border-blue-800',
    },
    'output-available': {
      label: 'Completed',
      icon: <CheckCircleIcon className="size-3" />,
      variant: 'default',
      className:
        'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-500 dark:border-emerald-800',
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
      className:
        'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-500 dark:border-orange-800',
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
}: ToolHeaderProps) => {
  const statusConfig = getStatusConfig(state);
  const toolIcon = getToolIcon(type);
  const toolName = title ?? getUserFriendlyToolName(type);

  return (
    <CollapsibleTrigger
      className={cn(
        'bg-background sticky top-0 z-10 flex w-full max-w-full min-w-0 cursor-pointer items-center justify-between gap-2 border-b p-3',
        className,
      )}
      style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
      {...props}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
        <span className="shrink-0">{toolIcon}</span>
        <span className="min-w-0 truncate text-sm font-medium">{toolName}</span>
        <Badge
          variant={statusConfig.variant}
          className={cn(
            'flex shrink-0 items-center gap-1',
            statusConfig.className,
          )}
        >
          {statusConfig.icon}
          <span className="text-xs whitespace-nowrap">
            {statusConfig.label}
          </span>
        </Badge>
      </div>
      <ChevronDownIcon className="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
    </CollapsibleTrigger>
  );
};

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      'data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground data-[state=closed]:animate-out data-[state=open]:animate-in max-w-full min-w-0 overflow-hidden outline-none',
      className,
    )}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<'div'> & {
  input: ToolUIPart['input'];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
  <Collapsible
    className={cn('max-w-full min-w-0 overflow-hidden', className)}
    defaultOpen={false}
    {...props}
  >
    <CollapsibleTrigger className="group hover:bg-muted/50 flex w-full min-w-0 items-center gap-2 px-4 py-3 text-left transition-colors">
      <ChevronDownIcon className="text-muted-foreground size-3 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
      <span className="text-muted-foreground truncate text-xs font-medium tracking-wide uppercase">
        Parameters
      </span>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <div className="max-w-full min-w-0 px-4 pb-4">
        <div className="bg-muted/50 max-w-full min-w-0 overflow-hidden rounded-md">
          <CodeBlock code={JSON.stringify(input, null, 2)} language="json" />
        </div>
      </div>
    </CollapsibleContent>
  </Collapsible>
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
    const result =
      output === true ||
      output === 'true' ||
      String(output).toLowerCase() === 'true';
    return (
      <div className={cn('min-w-0 p-5', className)} {...props}>
        <div className="flex items-center gap-3">
          {result ? (
            <>
              <CheckCircleIcon className="size-5 shrink-0 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-600">
                Connection successful
              </span>
            </>
          ) : (
            <>
              <XCircleIcon className="text-destructive size-5 shrink-0" />
              <span className="text-destructive text-sm font-medium">
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
