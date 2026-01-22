'use client';

import { useState } from 'react';
import { Database, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '../../shadcn/hover-card';
import { Button } from '../../shadcn/button';
import { cn } from '../../lib/utils';
import type { DatasourceItem } from './datasource-selector';

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
    <HoverCard>
      <HoverCardTrigger asChild>
        <div
          className={cn(
            'group border-border bg-muted/50 hover:bg-muted flex h-6 max-w-full min-w-0 cursor-default items-center gap-1.5 rounded-md border px-2 text-xs transition-colors',
            className,
          )}
        >
          {iconUrl ? (
            <img
              src={iconUrl}
              alt={displayName}
              className="h-3.5 w-3.5 shrink-0 object-contain"
            />
          ) : (
            <Database className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          )}
          <span className="min-w-0 truncate text-xs font-medium">
            {displayName}
          </span>
        </div>
      </HoverCardTrigger>
      <HoverCardContent 
        className="max-w-[calc(100vw-2rem)] w-72 p-4" 
        side="top"
        align="end"
        sideOffset={8}
      >
        <div className="flex gap-4 max-w-full min-w-0">
          {/* Header with icon and name */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
              {iconUrl ? (
                <img
                  src={iconUrl}
                  alt={datasource.name || datasource.slug || datasource.id}
                  className="h-6 w-6 object-contain"
                />
              ) : (
                <Database className="text-muted-foreground h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-sm leading-tight font-semibold">
                {datasource.name || datasource.slug || datasource.id}
              </h4>
            </div>
          </div>

          {/* Details */}
          {datasource.datasource_provider && (
            <div>
              <div className="bg-muted/50 border-border inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5">
                <span className="text-xs font-medium capitalize">
                  {datasource.datasource_provider.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          )}
        </div>
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
    const iconUrl = pluginLogoMap?.get(datasource.datasource_provider);
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
    setCurrentPage((prev) => Math.max(0, prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
  };

  return (
    <HoverCard open={isOpen} onOpenChange={handleOpenChange}>
      <HoverCardTrigger asChild>
        <div className="group border-border bg-muted/50 hover:bg-muted flex h-6 max-w-full min-w-0 cursor-default items-center gap-1.5 rounded-md border px-2 text-xs transition-colors">
          <Database className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 truncate text-xs font-medium">
            {datasources.length} datasources
          </span>
        </div>
      </HoverCardTrigger>
      <HoverCardContent 
        className="max-w-[calc(100vw-2rem)] w-72 p-4" 
        side="top"
        align="end"
        sideOffset={8}
      >
        <div className="space-y-4 max-w-full min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">Selected Datasources</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {datasources.length}{' '}
                {datasources.length === 1 ? 'datasource' : 'datasources'}
              </p>
            </div>
            {totalPages > 1 && (
              <div className="bg-muted/50 border-border flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1">
                <span className="text-muted-foreground text-xs font-medium whitespace-nowrap">
                  {currentPage + 1}/{totalPages}
                </span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="bg-border h-px" />

          {/* Datasources List */}
          <div className="space-y-1.5 max-w-full min-w-0">
            {currentItems.map((datasource) => {
              const iconUrl = pluginLogoMap?.get(
                datasource.datasource_provider,
              );
              // Use semantic name (name field) instead of technical identifier
              const displayName = datasource.name || datasource.slug || datasource.id;
              return (
                <div
                  key={datasource.id}
                  className="bg-muted/50 border-border hover:bg-muted flex items-center gap-2 rounded-md border p-2 transition-colors max-w-full min-w-0"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                    {iconUrl ? (
                      <img
                        src={iconUrl}
                        alt={displayName}
                        className="h-5 w-5 object-contain"
                      />
                    ) : (
                      <Database className="text-muted-foreground h-4 w-4" />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="min-w-0 text-xs font-medium break-words truncate">
                      {displayName}
                    </p>
                    {datasource.datasource_provider && (
                      <span className="bg-muted text-muted-foreground inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-xs font-medium capitalize w-fit">
                        {datasource.datasource_provider.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 border-t pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={handlePrevious}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-muted-foreground flex-1 text-center text-xs">
                {startIndex + 1}-{Math.min(endIndex, datasources.length)} of{' '}
                {datasources.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
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
