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
                "flex justify-center w-full transition-all duration-300 ease-in-out",
                selectedCount === 0
                    ? "opacity-0 -translate-y-2 pointer-events-none h-0 overflow-hidden my-0"
                    : "opacity-100 translate-y-0 h-auto my-4"
            )}
        >
            <div className="flex items-center gap-6 rounded-lg border bg-background p-2.5 shadow-sm">
                <div className='flex items-center gap-2.5'>
                    <div className="flex items-center justify-center rounded-md bg-primary/10 px-3 py-1.5 min-w-8">
                        <span className="text-sm font-semibold text-primary">
                            {selectedCount}
                        </span>
                    </div>
                    <span className="text-base font-medium text-foreground">
                        {selectedCount === 1 ? entityType : `${entityType}s`} <Trans i18nKey="organizations:selected" defaults="Selected" />
                    </span>
                </div>
                <div className='flex items-center'>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onDelete}
                        className="h-9 w-9 rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                        <Trash2 className="h-5 w-5" />
                    </Button>

                    {onClearSelection && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClearSelection}
                            className="h-9 w-9 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

