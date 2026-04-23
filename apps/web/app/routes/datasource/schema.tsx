import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { Filter, X } from 'lucide-react';

import { SchemaGraph, type SchemaGraphHandle } from '@qwery/ui/schema-graph';
import { useGetDatasourceMetadata } from '~/lib/queries/use-get-datasource-metadata';
import { loadDatasourceBySlug } from '~/lib/loaders/load-datasource-by-slug';
import { DevProfiler } from '~/lib/perf/dev-profiler';
import { Skeleton } from '@qwery/ui/skeleton';
import { Input } from '@qwery/ui/input';
import { Button } from '@qwery/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@qwery/ui/select';
import { useDebouncedValue } from '~/lib/hooks/use-debounced-value';

import type { Route } from './+types/schema';

export const clientLoader = loadDatasourceBySlug;

export default function Schema(props: Route.ComponentProps) {
  const params = useParams();
  const { t } = useTranslation();
  const slug = params.slug as string;
  const { datasource } = props.loaderData;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchemas, setSelectedSchemas] = useState<string[]>([]);
  const [selectedSchema, setSelectedSchema] = useState<string>('all');
  const graphRef = useRef<SchemaGraphHandle>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 200);

  const {
    data: metadata,
    isLoading: isLoadingMetadata,
    isError,
    isFetching,
  } = useGetDatasourceMetadata(datasource, {
    enabled: !!datasource,
  });

  const schemas = useMemo(() => {
    const list = metadata?.schemas ?? [];
    return Array.from(new Set(list.map((s) => s.name))).sort();
  }, [metadata?.schemas]);

  const handleSchemaChange = useCallback(
    (schemaValue: string) => {
      setSelectedSchema(schemaValue);
      setSelectedSchemas(schemaValue === 'all' ? [] : [schemaValue]);
    },
    [setSelectedSchema, setSelectedSchemas],
  );

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && searchQuery.trim()) {
        graphRef.current?.focusTable(searchQuery.trim());
      }
    },
    [searchQuery],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key;
      const isZoomIn = key === '+' || key === '=';
      const isZoomOut = key === '-' || key === '_';
      if ((event.metaKey || event.ctrlKey) && (isZoomIn || isZoomOut)) {
        event.preventDefault();
        if (isZoomIn) {
          graphRef.current?.zoomIn();
        } else {
          graphRef.current?.zoomOut();
        }
        return;
      }

      if (event.key === 'Escape') {
        if (document.activeElement === searchInputRef.current) {
          (document.activeElement as HTMLElement | null)?.blur?.();
        }
        setSearchQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!slug) return null;

  if (isLoadingMetadata || isFetching) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 flex-col gap-6 px-8 py-6 lg:px-16 lg:py-10">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
        <div className="flex-1 px-8 py-6 lg:px-16 lg:py-6">
          <Skeleton className="h-full w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!datasource) {
    throw new Response('Not Found', { status: 404 });
  }

  if (isError) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-muted-foreground text-sm">
          Failed to load datasource metadata.
        </p>
      </div>
    );
  }

  if (!metadata) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-muted-foreground text-sm">
          No schema data available for this datasource.
        </p>
      </div>
    );
  }

  const storageKey = `datasource-schema-positions:${datasource.id ?? slug}`;

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-col gap-6 px-8 py-6 lg:px-16 lg:py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold tracking-tight">
            {t('datasource.schema.title', { defaultValue: 'Schema' })}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-muted/30 border-border/50 focus-within:border-border flex h-12 flex-1 items-center gap-3 rounded-xl border px-4 transition-all focus-within:bg-transparent">
            <MagnifyingGlassIcon className="text-muted-foreground/60 h-5 w-5 shrink-0" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder={t('datasource.schema.search.placeholder', {
                defaultValue: 'Search tables...',
              })}
              className="h-full flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded-full p-1 transition-colors"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {schemas.length > 0 && (
            <Select value={selectedSchema} onValueChange={handleSchemaChange}>
              <SelectTrigger className="bg-muted/30 border-border/50 hover:bg-muted flex h-12 w-[180px] items-center gap-3 rounded-xl border px-4 transition-all focus:ring-0 focus-visible:ring-0">
                <Filter className="text-muted-foreground/60 h-5 w-5 shrink-0" />
                <SelectValue
                  placeholder={t('datasource.tables.filter.all', {
                    defaultValue: 'All Schemas',
                  })}
                  className="text-sm font-medium"
                >
                  {selectedSchema === 'all'
                    ? t('datasource.tables.filter.all', {
                        defaultValue: 'All Schemas',
                      })
                    : selectedSchema}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t('datasource.tables.filter.all', {
                    defaultValue: 'All Schemas',
                  })}
                </SelectItem>
                {schemas.map((schema) => (
                  <SelectItem key={schema} value={schema}>
                    {schema}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            type="button"
            variant="outline"
            className="bg-muted/30 border-border/50 hover:bg-muted h-12 rounded-xl border px-6 text-sm font-medium transition-all"
            onClick={() => graphRef.current?.resetLayout()}
          >
            {t('datasource.schema.actions.autoLayout', {
              defaultValue: 'Auto Layout',
            })}
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <div className="h-full px-8 py-6 lg:px-16 lg:py-6">
          <div className="bg-muted/30 border-border/50 h-full w-full overflow-hidden rounded-xl border">
            <DevProfiler id="DatasourceSchema/SchemaGraph">
              <SchemaGraph
                ref={graphRef}
                metadata={metadata}
                storageKey={storageKey}
                selectedSchemas={selectedSchemas}
                searchQuery={debouncedSearchQuery}
              />
            </DevProfiler>
          </div>
        </div>
      </div>
    </div>
  );
}
