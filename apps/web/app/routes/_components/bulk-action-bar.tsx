import { useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';

import { Button } from '@qwery/ui/button';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['common', 'organizations']);
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

  if (selectedCount === 0) return null;

  return (
    <div className="bg-destructive/5 border-destructive/10 animate-in fade-in slide-in-from-top-2 mb-6 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-sm backdrop-blur-[2px] duration-300">
      <div className="text-destructive flex items-center gap-2.5">
        <div className="bg-destructive/10 flex size-8 items-center justify-center rounded-lg">
          <Trash2 className="size-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-tight">
            {selectedCount}{' '}
            {selectedCount === 1 ? entityType : `${entityType}s`}{' '}
            <Trans i18nKey="organizations:selected" defaults="Selected" />
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="destructive"
          onClick={onDelete}
          className="shadow-destructive/10 h-9 rounded-lg px-4 text-xs font-bold shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          {selectedCount === 1
            ? t('common:delete_item')
            : t('common:delete_items')}
        </Button>
        {onClearSelection && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearSelection}
            className="hover:bg-destructive/10 hover:text-destructive h-9 rounded-lg px-3 text-xs font-medium transition-colors"
          >
            {t('common:cancel')}
          </Button>
        )}
      </div>
    </div>
  );
}
