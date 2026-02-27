import { AlertCircleIcon, ChevronDownIcon } from 'lucide-react';
import { Button } from '../../shadcn/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../shadcn/collapsible';
import { cn } from '../../lib/utils';
import { toToolError, toUserFacingError } from './user-facing-error';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

export interface ToolErrorVisualizerProps {
  errorText: string;
  title?: string;
  description?: string | React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Generic error visualizer component for tool errors.
 * Provides a consistent error UI that can be customized for specific use cases.
 */
export function ToolErrorVisualizer(props: ToolErrorVisualizerProps) {
  const { errorText, children, title } = props;
  const { t } = useTranslation('common');
  const [showDetails, setShowDetails] = useState(false);
  const { message, details, key, code } = toUserFacingError(
    toToolError(errorText),
    (key: string, params?: Record<string, unknown>) =>
      t(key, { defaultValue: key, ...(params ?? {}) }),
  );

  const resolvedTitle =
    (typeof title === 'string' ? title : undefined) ??
    t('errors.tool.title', { defaultValue: 'Error' });

  return (
    <div className="py-1">
      <Collapsible
        open={showDetails}
        onOpenChange={setShowDetails}
        className="border-destructive/10 bg-destructive/10 rounded border px-3 py-2.5"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <AlertCircleIcon className="text-destructive size-4 shrink-0" />
            <span className="text-destructive text-sm font-medium whitespace-nowrap">
              {resolvedTitle}:
            </span>
            <span className="text-destructive/90 mr-2 truncate text-sm">
              {message}
            </span>
            {code !== undefined && (
              <span className="text-destructive/60 hidden font-mono text-[10px] sm:inline-block">
                {key} · {code}
              </span>
            )}
          </div>

          {(details || children) && (
            <CollapsibleTrigger asChild>
              <Button
                variant="link"
                size="sm"
                className="text-muted-foreground/70 hover:text-foreground h-auto shrink-0 p-0 text-[11px] hover:no-underline"
              >
                {showDetails
                  ? t('errors.tool.hideTechnicalDetails', {
                      defaultValue: 'Hide details',
                    })
                  : t('errors.tool.viewTechnicalDetails', {
                      defaultValue: 'View details',
                    })}
                <ChevronDownIcon
                  className={cn(
                    'ml-1 size-3 transition-transform duration-200',
                    showDetails && 'rotate-180',
                  )}
                />
              </Button>
            </CollapsibleTrigger>
          )}
        </div>

        {children && <div className="text-foreground mt-2">{children}</div>}

        {details && (
          <CollapsibleContent>
            <div className="text-foreground border-destructive/10 mt-2.5 overflow-auto rounded border-t pt-2.5 font-mono text-[11px] leading-relaxed">
              <pre className="break-all whitespace-pre-wrap">{details}</pre>
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
}
