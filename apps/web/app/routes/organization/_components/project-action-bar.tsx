import { Trash2, Download, Copy } from 'lucide-react';

import { Button } from '@qwery/ui/button';
import { Trans } from '@qwery/ui/trans';

export function ProjectActionBar({
  selectedCount,
  onDelete,
  onExport,
  onCopy,
}: {
  selectedCount: number;
  onDelete: () => void;
  onExport: () => void;
  onCopy: () => void;
}) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="bg-muted/50 border-b flex items-center justify-between px-4 py-2">
      <div className="text-sm font-medium">
        <Trans
          i18nKey="organizations:selected_count"
          values={{ count: selectedCount }}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onCopy}>
          <Copy className="mr-2 h-4 w-4" />
          <Trans i18nKey="organizations:copy" />
        </Button>
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="mr-2 h-4 w-4" />
          <Trans i18nKey="organizations:export" />
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          <Trans i18nKey="organizations:delete" />
        </Button>
      </div>
    </div>
  );
}

