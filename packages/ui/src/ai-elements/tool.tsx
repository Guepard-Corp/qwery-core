'use client';

import { Badge } from '../shadcn/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../shadcn/collapsible';
import { cn } from '../lib/utils';
import { toUserFacingError } from '../qwery/ai/user-facing-error';
import type { ToolUIPart } from 'ai';
import { useTranslation } from 'react-i18next';
import { getUserFriendlyToolName } from '../qwery/ai/utils/tool-name';
import {
  BarChart3Icon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleDashedIcon,
  Code2Icon,
  DatabaseIcon,
  LinkIcon,
  Loader2Icon,
  PlugIcon,
  TableIcon,
  TerminalIcon,
  Trash2Icon,
  AlertCircleIcon,
  XCircleIcon,
  BanIcon,
  LineChartIcon,
  PieChartIcon,
  FileSearchIcon,
  WorkflowIcon,
  FileIcon,
  ListIcon,
  PlayIcon,
  ListTodo,
} from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { isValidElement } from 'react';
import { CodeBlock } from './code-block';

const getStateStyles = (state: ToolUIPart['state']) => {
  return {
    border: 'border-white/80 dark:border-white/10',
  };
};

export type ToolVariant = 'default' | 'minimal';

export type ToolProps = ComponentProps<typeof Collapsible> & {
  state?: ToolUIPart['state'];
  variant?: ToolVariant;
};

export const Tool = ({
  className,
  state,
  variant = 'default',
  ...props
}: ToolProps) => {
  const styles = getStateStyles(state || 'input-available');
  const isMinimal = variant === 'minimal';

  return (
    <Collapsible
      className={cn(
        'group/tool not-prose flex w-full min-w-0 flex-col overflow-hidden transition-all',
        isMinimal ? 'mb-1' : 'bg-card mb-4 rounded-xl border',
        !isMinimal && styles.border,
        !isMinimal && 'hover:border-white dark:hover:border-white/20',
        className,
      )}
      style={{ boxSizing: 'border-box' }}
      {...props}
    />
  );
};

export type ToolHeaderProps = {
  title?: string;
  type: ToolUIPart['type'];
  state: ToolUIPart['state'];
  className?: string;
  variant?: ToolVariant;
  children?: ReactNode;
};

const getStatusConfig = (
  status: ToolUIPart['state'],
  iconSize: 'sm' | 'md' = 'md',
) => {
  const iconSizeClass = iconSize === 'sm' ? 'size-3' : 'size-4';
  const configs: Record<
    string,
    {
      label: string;
      icon: ReactNode;
      className: string;
      bgClassName: string;
    }
  > = {
    'input-streaming': {
      label: 'Initializing',
      icon: <CircleDashedIcon className={cn(iconSizeClass, 'animate-pulse')} />,
      className: 'text-muted-foreground',
      bgClassName: 'bg-muted/50',
    },
    'input-available': {
      label: 'Running',
      icon: <Loader2Icon className={cn(iconSizeClass, 'animate-spin')} />,
      className: 'text-[#ffcb51] dark:text-[#ffcb51]',
      bgClassName: 'bg-[#ffcb51]/10 dark:bg-[#ffcb51]/20 backdrop-blur-sm',
    },
    'approval-requested': {
      label: 'Approval',
      icon: <AlertCircleIcon className={iconSizeClass} />,
      className: 'text-amber-600 dark:text-amber-400',
      bgClassName: 'bg-amber-100 dark:bg-amber-950',
    },
    'approval-responded': {
      label: 'Approved',
      icon: <CheckCircle2Icon className={iconSizeClass} />,
      className: 'text-emerald-600 dark:text-emerald-400',
      bgClassName: 'bg-emerald-100 dark:bg-emerald-950',
    },
    'output-available': {
      label: 'Complete',
      icon: <CheckCircle2Icon className={iconSizeClass} />,
      className: 'text-emerald-600 dark:text-emerald-400',
      bgClassName: 'bg-emerald-100 dark:bg-emerald-950',
    },
    'output-error': {
      label: 'Failed',
      icon: <XCircleIcon className={iconSizeClass} />,
      className: 'text-destructive',
      bgClassName: 'bg-red-100 dark:bg-red-950',
    },
    'output-denied': {
      label: 'Denied',
      icon: <BanIcon className={iconSizeClass} />,
      className: 'text-orange-600 dark:text-orange-400',
      bgClassName: 'bg-orange-100 dark:bg-orange-950',
    },
  };

  return (
    configs[status] ?? {
      label: status,
      icon: <CircleDashedIcon className={iconSizeClass} />,
      className: 'text-muted-foreground',
      bgClassName: 'bg-muted/50',
    }
  );
};

const getToolIcon = (type: string, size: 'sm' | 'md' = 'md') => {
  const sizeClass = size === 'sm' ? 'size-4' : 'size-5';
  const iconMap: Record<string, ReactNode> = {
    'tool-testConnection': <PlugIcon className={sizeClass} />,
    'tool-runQuery': <DatabaseIcon className={sizeClass} />,
    'tool-runQueries': <ListIcon className={sizeClass} />,
    'tool-getTableSchema': <TableIcon className={sizeClass} />,
    'tool-getSchema': <FileSearchIcon className={sizeClass} />,
    'tool-generateChart': <BarChart3Icon className={sizeClass} />,
    'tool-selectChartType': <PieChartIcon className={sizeClass} />,
    'tool-deleteSheet': <Trash2Icon className={sizeClass} />,
    'tool-readLinkData': <LinkIcon className={sizeClass} />,
    'tool-api_call': <Code2Icon className={sizeClass} />,
    'tool-listViews': <ListIcon className={sizeClass} />,
    'tool-generateSql': <TerminalIcon className={sizeClass} />,
    'tool-startWorkflow': <WorkflowIcon className={sizeClass} />,
    'tool-viewSheet': <FileIcon className={sizeClass} />,
    'tool-todowrite': <ListTodo className={sizeClass} />,
    'tool-todoread': <ListTodo className={sizeClass} />,
  };

  return iconMap[type] ?? <TerminalIcon className={sizeClass} />;
};

export const ToolHeader = ({
  className,
  title,
  type,
  state,
  variant = 'default',
  children,
  ...props
}: ToolHeaderProps) => {
  const isMinimal = variant === 'minimal';
  const statusConfig = getStatusConfig(state, isMinimal ? 'sm' : 'md');
  const toolIcon = getToolIcon(type, isMinimal ? 'sm' : 'md');
  const toolName = title ?? getUserFriendlyToolName(type);

  if (isMinimal) {
    return (
      <CollapsibleTrigger
        className={cn(
          'group/header flex w-full cursor-pointer items-center gap-2 py-1.5 text-left',
          className,
        )}
        {...props}
      >
        <div className="text-muted-foreground group-hover/header:text-foreground flex size-4 shrink-0 items-center justify-center transition-all duration-200 group-data-[state=open]/tool:rotate-90">
          <ChevronRightIcon className="size-3.5" />
        </div>

        <div className="text-primary flex size-4 shrink-0 items-center justify-center transition-opacity duration-200 group-hover/header:opacity-80">
          {toolIcon}
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="text-muted-foreground group-hover/header:text-foreground truncate text-sm transition-colors duration-200">
            {toolName}
          </span>
          <div
            className={cn(
              'flex shrink-0 items-center transition-opacity duration-200 group-hover/header:opacity-80',
              statusConfig.className,
            )}
          >
            {statusConfig.icon}
          </div>
        </div>
        {children && <div className="flex items-center gap-2">{children}</div>}
      </CollapsibleTrigger>
    );
  }

  return (
    <CollapsibleTrigger
      className={cn(
        'group/header hover:bg-accent/50 flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left transition-all',
        className,
      )}
      {...props}
    >
      <div className="from-primary/10 via-primary/5 to-primary/5 text-primary ring-primary/20 flex size-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br shadow-sm ring-1">
        {toolIcon}
      </div>

      <div className="flex min-w-0 flex-1">
        <span className="truncate text-base font-semibold tracking-tight">
          {toolName}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {children && (
          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </div>
        )}

        <div
          className={cn(
            'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
            statusConfig.bgClassName,
            statusConfig.className,
          )}
        >
          {statusConfig.icon}
          <span className="whitespace-nowrap">{statusConfig.label}</span>
        </div>

        <div className="bg-muted/50 group-hover/header:bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors">
          <ChevronDownIcon className="text-muted-foreground size-4 transition-transform duration-300 ease-out group-data-[state=open]/tool:rotate-180" />
        </div>
      </div>
    </CollapsibleTrigger>
  );
};

export type ToolContentProps = ComponentProps<typeof CollapsibleContent> & {
  variant?: ToolVariant;
};

export const ToolContent = ({
  className,
  variant = 'default',
  ...props
}: ToolContentProps) => {
  const isMinimal = variant === 'minimal';

  return (
    <CollapsibleContent
      className={cn(
        'data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden',
        isMinimal && 'border-border/50 ml-6 border-l pl-2 text-sm',
        className,
      )}
      {...props}
    />
  );
};

export type ToolInputProps = ComponentProps<'div'> & {
  input: ToolUIPart['input'];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) =>
  null;

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
  const { t } = useTranslation('common');
  if (!(output || errorText)) {
    return null;
  }

  if (isTestConnection && !errorText) {
    const result =
      output === true ||
      output === 'true' ||
      String(output).toLowerCase() === 'true';
    return (
      <div className={cn('border-t-2 px-5 py-5', className)} {...props}>
        <div
          className={cn(
            'flex items-center gap-4 rounded-xl px-5 py-4 text-sm font-medium shadow-sm',
            result
              ? 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 ring-2 ring-emerald-200 dark:from-emerald-950 dark:to-emerald-900 dark:text-emerald-300 dark:ring-emerald-800'
              : 'bg-gradient-to-r from-red-50 to-red-100 text-red-700 ring-2 ring-red-200 dark:from-red-950 dark:to-red-900 dark:text-red-300 dark:ring-red-800',
          )}
        >
          {result ? (
            <CheckCircle2Icon className="size-6 shrink-0" />
          ) : (
            <XCircleIcon className="size-6 shrink-0" />
          )}
          <span>
            {result
              ? 'Connection verified successfully'
              : 'Connection verification failed'}
          </span>
        </div>
      </div>
    );
  }

  if (errorText) {
    const { message, details } = toUserFacingError(errorText, (key: string) =>
      t(key, { defaultValue: key }),
    );
    return (
      <div
        className={cn(
          'border-t-2 border-red-200 px-5 py-5 dark:border-red-800',
          className,
        )}
        {...props}
      >
        <div className="rounded-xl bg-gradient-to-br from-red-50 via-red-50 to-orange-50 p-5 ring-2 ring-red-200 dark:from-red-950 dark:via-red-950 dark:to-orange-950 dark:ring-red-800">
          <div className="text-destructive mb-3 flex items-center gap-2 text-sm font-bold">
            <AlertCircleIcon className="size-5" />
            <span>Execution Error</span>
          </div>
          <div className="bg-background/80 rounded-lg p-4 backdrop-blur-sm">
            <p className="text-muted-foreground text-xs leading-relaxed">
              {message}
            </p>
            {details && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs underline">
                  View details
                </summary>
                <pre className="text-muted-foreground mt-2 text-xs leading-relaxed whitespace-pre-wrap">
                  {details}
                </pre>
              </details>
            )}
          </div>
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

  return (
    <div
      className={cn('border-border/30 border-t px-4 py-4', className)}
      {...props}
    >
      {Output}
    </div>
  );
};
