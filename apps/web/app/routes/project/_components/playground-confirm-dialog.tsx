import { useTranslation } from 'react-i18next';
import { Database, Play } from 'lucide-react';
import { Trans } from '@qwery/ui/trans';
import type { PlaygroundSuggestion } from '@qwery/playground/playground-suggestions';
import { PLAYGROUND_TABLES } from '@qwery/playground/utils/playground-sql';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@qwery/ui/alert-dialog';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@qwery/ui/hover-card';

type PlaygroundConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSuggestion: PlaygroundSuggestion | null;
  onConfirm: () => void;
  isPending: boolean;
  showRequestSection?: boolean;
};

export function PlaygroundConfirmDialog({
  open,
  onOpenChange,
  selectedSuggestion,
  onConfirm,
  isPending,
  showRequestSection = true,
}: PlaygroundConfirmDialogProps) {
  const { t } = useTranslation('welcome');
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 ring-primary/20 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ring-1">
              <Play className="text-primary h-7 w-7" />
            </div>
            <div className="flex-1 space-y-1 pt-1">
              <AlertDialogTitle className="text-xl leading-tight font-semibold">
                <Trans i18nKey="welcome:playgroundConfirm.title" />
              </AlertDialogTitle>
              <p className="text-muted-foreground text-sm leading-relaxed">
                <Trans i18nKey="welcome:playgroundConfirm.description" />
              </p>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          <div className="pb-4">
            <p className="text-foreground mb-3 text-center text-xs font-medium">
              {t('playgroundConfirm.availableTables')}
            </p>
            <div className="flex flex-wrap justify-center gap-2.5">
              {PLAYGROUND_TABLES.map((table) => (
                <HoverCard key={table.name} openDelay={200} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <button
                      type="button"
                      className="bg-muted/80 text-foreground border-border/50 hover:bg-muted hover:border-border inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors"
                    >
                      <Database className="text-muted-foreground h-3.5 w-3.5" />
                      {table.name}
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent
                    side="top"
                    align="center"
                    sideOffset={8}
                    className="w-80 p-0"
                  >
                    <div className="space-y-3 p-4">
                      <div className="flex items-center gap-2">
                        <Database className="text-primary h-4 w-4" />
                        <h4 className="text-sm font-semibold capitalize">
                          {table.name}
                        </h4>
                      </div>
                      {table.description && (
                        <p className="text-muted-foreground text-xs">
                          {table.description}
                        </p>
                      )}
                      {table.sampleData && table.sampleData.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-foreground text-xs font-medium">
                            {t('playgroundConfirm.sampleDataLabel')}
                          </p>
                          <div className="bg-muted/30 overflow-hidden rounded-md border">
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead className="bg-muted/50 border-b">
                                  <tr>
                                    {table.sampleData[0] &&
                                      Object.keys(table.sampleData[0]).map(
                                        (key) => (
                                          <th
                                            key={key}
                                            className="text-foreground px-2.5 py-1.5 text-left font-medium capitalize"
                                          >
                                            {key.replace(/_/g, ' ')}
                                          </th>
                                        ),
                                      )}
                                  </tr>
                                </thead>
                                <tbody>
                                  {table.sampleData
                                    .slice(0, 3)
                                    .map((row, idx) => (
                                      <tr
                                        key={idx}
                                        className="hover:bg-muted/50 border-b transition-colors last:border-b-0"
                                      >
                                        {row &&
                                          Object.values(row).map(
                                            (value, cellIdx) => (
                                              <td
                                                key={cellIdx}
                                                className="text-muted-foreground px-2.5 py-1.5"
                                              >
                                                {String(value)}
                                              </td>
                                            ),
                                          )}
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </HoverCardContent>
                </HoverCard>
              ))}
            </div>
          </div>

          {showRequestSection && (
            <div className="bg-muted/30 relative rounded-xl border-2 border-dashed p-4">
              <span className="bg-background text-muted-foreground absolute -top-2.5 left-4 px-2 text-[10px] font-black tracking-widest uppercase">
                {t('playgroundConfirm.yourRequest')}
              </span>
              <p className="text-foreground text-sm leading-relaxed font-semibold italic">
                &quot;{selectedSuggestion?.query}&quot;
              </p>
            </div>
          )}
        </div>

        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel disabled={isPending} className="mt-0">
            <Trans i18nKey="welcome:playgroundConfirm.cancel" />
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isPending
              ? t('playgroundConfirm.creating')
              : t('playgroundConfirm.continue')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
