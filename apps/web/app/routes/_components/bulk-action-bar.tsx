import { useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';

import { Button } from '@qwery/ui/button';
import { Trans } from '@qwery/ui/trans';
import { cn } from '@qwery/ui/utils';

export function BulkActionBar({
  selectedCount,
  onDelete,
  onClearSelection,
  entityType = 'item',
}: {
  selectedCount: number;
  onDelete: () => void;
  onClearSelection?: () => void;
  entityType?: string;
}) {
  useEffect(() => {
    if (selectedCount === 0 || !onClearSelection) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClearSelection();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [selectedCount, onClearSelection]);

  return (
    <div
      className={cn(
        'flex w-full justify-center transition-all duration-300 ease-in-out',
        selectedCount === 0
          ? 'pointer-events-none my-0 h-0 -translate-y-2 overflow-hidden opacity-0'
          : 'my-4 h-auto translate-y-0 opacity-100',
      )}
    >
      <div className="bg-background flex items-center gap-6 rounded-lg border p-2.5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary/10 flex min-w-8 items-center justify-center rounded-md px-3 py-1.5">
            <span className="text-primary text-sm font-semibold">
              {selectedCount}
            </span>
          </div>
          <span className="text-foreground text-base font-medium">
            {selectedCount === 1 ? entityType : `${entityType}s`}{' '}
            <Trans i18nKey="organizations:selected" defaults="Selected" />
          </span>
        </div>
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive h-9 w-9 rounded-md transition-colors"
          >
            <Trash2 className="h-5 w-5" />
          </Button>

          {onClearSelection && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClearSelection}
              className="text-muted-foreground hover:bg-muted hover:text-foreground h-9 w-9 rounded-md transition-colors"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
