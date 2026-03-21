'use client';

import { useState } from 'react';
import {
  Database,
  ChevronLeft,
  ChevronRight,
  Layers,
  ExternalLink,
} from 'lucide-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '../../shadcn/hover-card';
import { Button } from '../../shadcn/button';
import { cn } from '../../lib/utils';
import type { DatasourceItem } from './datasource-selector';
import { getDatasourceIcon } from './utils/datasource-icon';
import { shouldInvertDatasourceIcon } from '@qwery/shared/utils';

export type { DatasourceItem };

const ITEMS_PER_PAGE = 5;

export interface DatasourceBadgeProps {
  datasource: DatasourceItem;
  iconUrl?: string;
  className?: string;
}

export function DatasourceBadge({
  datasource,
  iconUrl,
  className,
}: DatasourceBadgeProps) {
  const displayName = datasource.name || datasource.slug || datasource.id;

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <a
          href={`/ds/${datasource.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'group border-border bg-background/50 ring-offset-background hover:bg-background relative flex h-7 max-w-full min-w-0 cursor-pointer items-center gap-2 rounded-md border px-2.5 text-xs backdrop-blur-sm transition-all hover:shadow-sm',
            className,
          )}
        >
          <div className="bg-muted flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-sm">
            {iconUrl ? (
              <img
                src={iconUrl}
                alt={displayName}
                className={cn(
                  'h-3.5 w-3.5 object-contain transition-transform group-hover:scale-105',
                  shouldInvertDatasourceIcon(datasource.datasource_provider) &&
                    'dark:invert',
                )}
              />
            ) : (
              <Database className="text-muted-foreground group-hover:text-foreground h-3 w-3 transition-colors" />
            )}
          </div>
          <span className="text-foreground/70 group-hover:text-foreground min-w-0 truncate font-semibold tracking-tight">
            {displayName}
          </span>
        </a>
      </HoverCardTrigger>
      <HoverCardContent
        className="border-border bg-popover z-[100] w-72 overflow-hidden rounded-lg border p-4 shadow-xl"
        side="top"
        align="end"
        sideOffset={12}
      >
        <a
          href={`/ds/${datasource.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-4 transition-opacity hover:opacity-90"
        >
          <div className="bg-muted flex h-12 w-12 shrink-0 items-center justify-center rounded-lg shadow-inner">
            {iconUrl ? (
              <img
                src={iconUrl}
                alt={datasource.name || datasource.slug || datasource.id}
                className={cn(
                  'h-7 w-7 object-contain',
                  shouldInvertDatasourceIcon(datasource.datasource_provider) &&
                    'dark:invert',
                )}
              />
            ) : (
              <Database className="text-muted-foreground h-6 w-6" />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h4 className="text-popover-foreground truncate text-sm leading-tight font-bold tracking-tight">
              {datasource.name || datasource.slug || datasource.id}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {datasource.datasource_provider && (
                <span className="bg-accent text-accent-foreground inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                  {datasource.datasource_provider.replace(/_/g, ' ')}
                </span>
              )}
            </div>
          </div>
          <ExternalLink className="text-muted-foreground h-4 w-4 shrink-0" />
        </a>
      </HoverCardContent>
    </HoverCard>
  );
}

export interface DatasourceBadgesProps {
  datasources: DatasourceItem[];
  pluginLogoMap?: Map<string, string>;
  className?: string;
}

export function DatasourceBadges({
  datasources,
  pluginLogoMap,
  className,
}: DatasourceBadgesProps) {
  if (!datasources || datasources.length === 0) {
    return null;
  }

  // If single datasource, show it normally
  if (datasources.length === 1) {
    const datasource = datasources[0];
    if (!datasource) {
      return null;
    }
    const iconUrl = getDatasourceIcon(
      pluginLogoMap,
      datasource.datasource_provider,
    );
    return (
      <div className={cn('mb-2', className)}>
        <DatasourceBadge datasource={datasource} iconUrl={iconUrl} />
      </div>
    );
  }

  // If multiple datasources, show placeholder badge with hover to see all
  return (
    <div className={cn('mb-2', className)}>
      <DatasourceBadgesHover
        datasources={datasources}
        pluginLogoMap={pluginLogoMap}
      />
    </div>
  );
}

function DatasourceBadgesHover({
  datasources,
  pluginLogoMap,
}: {
  datasources: DatasourceItem[];
  pluginLogoMap?: Map<string, string>;
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const totalPages = Math.ceil(datasources.length / ITEMS_PER_PAGE);
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentItems = datasources.slice(startIndex, endIndex);

  // Reset to first page when hover card closes
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setCurrentPage(0);
    }
  };

  const handlePrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentPage((prev) => Math.max(0, prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
  };

  // Get first 3 unique icons for the stack
  const stackIcons = datasources.slice(0, 3).map((ds) => ({
    url: getDatasourceIcon(pluginLogoMap, ds.datasource_provider),
    provider: ds.datasource_provider,
  }));

  return (
    <HoverCard
      open={isOpen}
      onOpenChange={handleOpenChange}
      openDelay={200}
      closeDelay={100}
    >
      <HoverCardTrigger asChild>
        <div className="group border-border bg-background/50 ring-offset-background hover:bg-background relative flex h-7 cursor-pointer items-center gap-2 rounded-md border pr-3 pl-1.5 text-xs backdrop-blur-sm transition-all hover:shadow-sm">
          <div className="flex -space-x-2">
            {stackIcons.map((icon, i) => (
              <div
                key={i}
                className="border-background/50 bg-muted flex h-5 w-5 items-center justify-center rounded border-2"
                style={{ zIndex: stackIcons.length - i }}
              >
                {icon.url ? (
                  <img
                    src={icon.url}
                    alt=""
                    className={cn(
                      'h-3 w-3 object-contain',
                      shouldInvertDatasourceIcon(icon.provider) &&
                        'dark:invert',
                    )}
                  />
                ) : (
                  <Database className="text-muted-foreground h-2.5 w-2.5" />
                )}
              </div>
            ))}
            {datasources.length > 3 && (
              <div className="border-background/50 bg-muted z-0 flex h-5 w-5 items-center justify-center rounded border-2 text-[8px] font-bold">
                +{datasources.length - 3}
              </div>
            )}
          </div>
          <span className="text-foreground/70 group-hover:text-foreground font-bold tracking-tight">
            {datasources.length} datasources
          </span>
        </div>
      </HoverCardTrigger>
      <HoverCardContent
        className="border-border bg-popover z-[100] w-72 overflow-hidden rounded-lg border p-0 shadow-xl"
        side="top"
        align="end"
        sideOffset={12}
      >
        <div className="overflow-hidden">
          {/* Header */}
          <div className="border-border/40 bg-muted/30 flex items-center justify-between border-b px-3 py-2.5">
            <div className="flex items-center gap-2">
              <div className="bg-accent/40 flex h-7 w-7 items-center justify-center rounded">
                <Layers className="text-accent-foreground h-4 w-4" />
              </div>
              <div>
                <p className="text-popover-foreground text-xs font-bold tracking-tight">
                  Active Context
                </p>
                <p className="text-muted-foreground text-[9px] font-medium tracking-widest uppercase">
                  {datasources.length} selected
                </p>
              </div>
            </div>
            {totalPages > 1 && (
              <div className="bg-muted/50 text-muted-foreground flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold">
                {currentPage + 1} / {totalPages}
              </div>
            )}
          </div>

          {/* List */}
          <div className="max-h-[260px] space-y-0.5 overflow-y-auto p-1.5">
            {currentItems.map((datasource) => {
              const iconUrl = getDatasourceIcon(
                pluginLogoMap,
                datasource.datasource_provider,
              );
              const displayName =
                datasource.name || datasource.slug || datasource.id;
              return (
                <a
                  key={datasource.id}
                  href={`/ds/${datasource.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group hover:bg-muted relative flex items-center gap-2.5 rounded p-1.5 transition-all"
                >
                  <div className="bg-muted group-hover:bg-background flex h-7 w-7 shrink-0 items-center justify-center rounded shadow-inner transition-colors">
                    {iconUrl ? (
                      <img
                        src={iconUrl}
                        alt=""
                        className={cn(
                          'h-4 w-4 object-contain',
                          shouldInvertDatasourceIcon(
                            datasource.datasource_provider,
                          ) && 'dark:invert',
                        )}
                      />
                    ) : (
                      <Database className="text-muted-foreground h-3 w-3" />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center">
                    <p className="text-popover-foreground truncate text-[11px] font-bold tracking-tight">
                      {displayName}
                    </p>
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <span className="text-muted-foreground truncate text-[9px] font-medium tracking-widest uppercase">
                        {datasource.datasource_provider.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="text-muted-foreground h-3 w-3 shrink-0 opacity-30 transition-opacity group-hover:opacity-100" />
                </a>
              );
            })}
          </div>

          {/* Paging Footer */}
          {totalPages > 1 && (
            <div className="border-border/40 bg-muted/20 flex items-center justify-between border-t px-2 py-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 p-0"
                onClick={handlePrevious}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-muted-foreground text-[9px] font-bold tracking-wider uppercase">
                {startIndex + 1} - {Math.min(endIndex, datasources.length)} of{' '}
                {datasources.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 p-0"
                onClick={handleNext}
                disabled={currentPage >= totalPages - 1}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
