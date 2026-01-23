import { useCallback, useState, type ReactNode } from 'react';
import { ArrowRight, Database } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '../../shadcn/card';
import { Trans } from '../trans';
import { cn } from '../../lib/utils';
import { ConnectionLines } from './connection-lines';
import { formatRelativeTime } from '../ai/utils/conversation-utils';

export interface DatasourceCardProps {
  id: string;
  name: string;
  createdAt: Date;
  createdBy: string;
  logo?: string;
  provider?: string;
  onLogoError?: (datasourceId: string) => void;
  viewButton?: ReactNode;
  onClick?: () => void;
  className?: string;
  dataTest?: string;
}

function formatProviderName(provider?: string): string {
  if (!provider) return '';

  // Convert provider ID to display name
  // e.g., "postgresql" -> "PostgreSQL", "pglite" -> "PGLite", "mysql" -> "MySQL"
  return provider
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export function DatasourceCard({
  id,
  name,
  createdAt,
  createdBy,
  logo,
  provider,
  onLogoError,
  viewButton,
  onClick,
  className,
  dataTest,
}: DatasourceCardProps) {
  const [logoError, setLogoError] = useState(false);

  const handleLogoError = useCallback(() => {
    setLogoError(true);
    onLogoError?.(id);
  }, [id, onLogoError]);

  const showLogo = logo && !logoError;
  const providerDisplayName = formatProviderName(provider);

  return (
    <Card
      className={cn(
        'group bg-background border-border relative w-full p-1 transition-all duration-300',
        'hover:border-primary/30 hover:shadow-primary/10 rounded-2xl hover:shadow-2xl',
        className,
      )}
      data-test={dataTest}
    >
      <div className="absolute inset-0 z-0">
        <ConnectionLines />
      </div>

      <div className="bg-background/80 group-hover:bg-background/60 relative z-10 flex h-full flex-col rounded-xl backdrop-blur-[2px] transition-colors duration-500">
        <CardHeader className="flex flex-row items-start gap-3 space-y-0 p-4 pb-3">
          <div className="relative">
            <div className="bg-primary absolute inset-0 rounded-lg opacity-0 blur-sm transition-opacity duration-500 group-hover:opacity-15" />
            <div className="bg-muted border-border group-hover:border-primary/30 relative flex h-10 w-10 items-center justify-center rounded-lg border transition-colors duration-300">
              {showLogo ? (
                <img
                  src={logo}
                  alt={name}
                  className="h-full w-full object-contain p-1.5"
                  onError={handleLogoError}
                />
              ) : (
                <Database className="text-primary fill-primary/20 h-6 w-6" />
              )}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            {providerDisplayName && (
              <div className="mb-1 flex items-center gap-2">
                <span className="text-primary/80 bg-primary/10 border-primary/10 rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase">
                  {providerDisplayName}
                </span>
              </div>
            )}
            <CardTitle className="text-foreground group-hover:text-foreground/90 truncate text-base font-medium transition-colors duration-300">
              {name}
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-4 pt-0">
          <div className="border-border/50 grid grid-cols-2 gap-x-6 gap-y-3 border-t py-2 pt-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                <Trans i18nKey="datasources:card.created" defaults="Created" />
              </span>
              <span className="text-foreground text-xs font-medium">
                {formatRelativeTime(createdAt)}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 text-right">
              <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                <Trans
                  i18nKey="datasources:card.createdBy"
                  defaults="Created by"
                />
              </span>
              <span className="text-foreground text-xs font-medium">
                {createdBy}
              </span>
            </div>
          </div>

          {/* Action Button */}
          {viewButton || onClick ? (
            viewButton ? (
              <div className="group/btn bg-muted/50 border-border hover:bg-muted hover:border-primary/30 relative w-full overflow-hidden rounded-lg border transition-all hover:shadow-lg">
                {viewButton}
              </div>
            ) : (
              <button
                onClick={onClick}
                className="group/btn bg-muted/50 border-border hover:bg-muted hover:border-primary/30 relative w-full overflow-hidden rounded-lg border px-3 py-2 transition-all hover:shadow-lg active:scale-[0.98]"
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-foreground group-hover/btn:text-foreground text-xs font-medium transition-colors">
                    <Trans i18nKey="datasources:card.view" defaults="View" />
                  </span>
                  <ArrowRight className="text-muted-foreground group-hover/btn:text-foreground h-3.5 w-3.5 transition-all group-hover/btn:translate-x-1" />
                </div>
              </button>
            )
          ) : null}
        </CardContent>
      </div>
    </Card>
  );
}
