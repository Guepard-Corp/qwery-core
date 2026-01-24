import { Trash2, X } from 'lucide-react';

import { Button } from '@qwery/ui/button';
import { Trans } from '@qwery/ui/trans';
import { cn } from '@qwery/ui/utils';

export function ActionBar({
  selectedCount,
  onDelete,
  onClearSelection,
}: {
  selectedCount: number;
  onDelete: () => void;
  onClearSelection?: () => void;
}) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="bg-background/95 supports-backdrop-filter:bg-background/60 border-b flex items-center justify-between px-6 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">
          <Trans
            i18nKey="organizations:selected_count"
            values={{ count: selectedCount }}
          />
        </span>
        {onClearSelection && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <Button
        variant="destructive"
        size="sm"
        onClick={onDelete}
        className="h-8 px-4"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        <Trans i18nKey="organizations:delete" />
      </Button>
    </div>
  );
}

