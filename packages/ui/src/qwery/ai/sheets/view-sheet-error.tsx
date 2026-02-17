import {
  FileSpreadsheetIcon,
  SearchIcon,
  LightbulbIcon,
  ChevronDownIcon,
  InfoIcon,
  XCircleIcon,
} from 'lucide-react';
import { Button } from '../../../shadcn/button';
import { ToolErrorVisualizer } from '../tool-error-visualizer';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../../shadcn/collapsible';
import { cn } from '../../../lib/utils';
import { useState } from 'react';
import { toUserFacingError } from '../user-facing-error';
import { useTranslation } from 'react-i18next';

export interface ViewSheetErrorProps {
  errorText: string;
  sheetName?: string;
  onRetry?: (correctedSheetName: string) => void;
  availableSheets?: string[];
}

/**
 * Parses error messages to extract helpful information for sheet-related errors
 */
function parseSheetError(errorText: string): {
  isTableNotFound: boolean;
  suggestedSheetName?: string;
  originalSheetName?: string;
} {
  const tableNotFoundRegex =
    /Table with name\s+["']?(\w+)["']?\s+does not exist/i;
  const suggestionRegex = /Did you mean\s+["']?(\w+)["']?\?/i;

  const tableMatch = errorText.match(tableNotFoundRegex);
  const suggestionMatch = errorText.match(suggestionRegex);

  return {
    isTableNotFound: !!tableMatch,
    originalSheetName: tableMatch?.[1],
    suggestedSheetName: suggestionMatch?.[1],
  };
}

/**
 * Specialized error visualizer for viewSheet tool errors.
 * Handles "sheet not found" errors with helpful suggestions and available sheets.
 */
export function ViewSheetError({
  errorText,
  sheetName,
  onRetry,
  availableSheets = [],
}: ViewSheetErrorProps) {
  const { t } = useTranslation('common');
  const [showDetails, setShowDetails] = useState(false);
  const { isTableNotFound, suggestedSheetName, originalSheetName } =
    parseSheetError(errorText);

  const displaySheetName = sheetName || originalSheetName || 'unknown';

  if (isTableNotFound) {
    return (
      <ToolErrorVisualizer
        errorText={errorText}
        title="Sheet Not Found"
        description={`The sheet ${displaySheetName} does not exist in the database.`}
      >
        {suggestedSheetName && (
          <div className="border-primary/20 bg-primary/5 rounded-lg border p-4">
            <div className="flex items-start gap-3">
              <LightbulbIcon className="text-primary mt-0.5 size-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-primary text-sm font-medium">
                  Did you mean{' '}
                  <span className="font-mono">{suggestedSheetName}</span>?
                </p>
                {onRetry && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => onRetry(suggestedSheetName)}
                  >
                    <FileSpreadsheetIcon className="mr-2 size-4" />
                    View {suggestedSheetName}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {availableSheets.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <SearchIcon className="text-muted-foreground size-4" />
              <p className="text-sm font-medium">Available Sheets:</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableSheets.map((availableSheet) => (
                <Button
                  key={availableSheet}
                  variant="outline"
                  size="sm"
                  className="h-auto py-1.5 text-xs"
                  onClick={() => onRetry?.(availableSheet)}
                >
                  <FileSpreadsheetIcon className="mr-1.5 size-3" />
                  {availableSheet}
                </Button>
              ))}
            </div>
          </div>
        )}

        {!suggestedSheetName && availableSheets.length === 0 && (
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">
              Try listing available sheets or check the sheet name spelling.
            </p>
          </div>
        )}
      </ToolErrorVisualizer>
    );
  }

  const { message, details } = toUserFacingError(errorText, (key: string) =>
    t(key, { defaultValue: key }),
  );
  return (
    <div className="min-w-0 space-y-3 p-4">
      <div className="flex items-center gap-3">
        <XCircleIcon className="text-destructive size-5 shrink-0" />
        <span className="text-destructive text-sm font-medium">{message}</span>
      </div>
      {details && (
        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              <InfoIcon className="mr-1.5 size-3.5" />
              View details
              <ChevronDownIcon
                className={cn(
                  'ml-1.5 size-3.5 transition-transform duration-200',
                  showDetails && 'rotate-180',
                )}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-destructive/20 bg-destructive/5 mt-3 rounded-lg border p-4">
              <pre className="text-destructive font-mono text-xs break-words whitespace-pre-wrap">
                {details}
              </pre>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
