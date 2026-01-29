'use client';

import React, { useCallback, useState } from 'react';
import { ChevronRight, ChevronDown, RefreshCw } from 'lucide-react';
import { Button } from '@qwery/ui/button';
import { JSON_PREVIEW_CONFIG } from '~/lib/utils/json-preview-utils';

export type JsonViewMode = 'tree' | 'raw' | 'table';

interface JsonViewerProps {
  data: unknown;
  expandedPaths: Set<string>;
  onTogglePath: (path: string) => void;
  viewMode?: JsonViewMode;
  onViewModeChange?: (mode: JsonViewMode) => void;
  itemsPerPage?: number;
}

function RawJsonViewer({
  data,
  isTruncated,
}: {
  data: unknown;
  isTruncated?: boolean;
}) {
  const highlightJson = (json: string) => {
    // Escape HTML characters to prevent XSS and broken tags
    const escaped = json
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return escaped.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = 'text-purple-500 dark:text-purple-400'; // number
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'text-blue-600 dark:text-blue-400 font-medium'; // key
          } else {
            cls = 'text-green-600 dark:text-green-400'; // string
          }
        } else if (/true|false/.test(match)) {
          cls = 'text-orange-500'; // boolean
        } else if (/null/.test(match)) {
          cls = 'text-muted-foreground/50 italic'; // null
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
  };

  const formatted = JSON.stringify(data, null, 2);
  const highlighted = highlightJson(formatted);

  return (
    <div className="relative">
      <pre
        className="whitespace-pre-wrap wrap-break-word font-mono text-xs leading-relaxed"
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
      {isTruncated && (
        <div className="text-muted-foreground/70 italic mt-2 border-t border-border/40 pt-2 text-[10px]">
          ... content truncated for performance
        </div>
      )}
    </div>
  );
}

export function JsonViewer({
  data,
  expandedPaths,
  onTogglePath,
  viewMode = 'tree',
  onViewModeChange,
  itemsPerPage = JSON_PREVIEW_CONFIG.MAX_ITEMS_TO_RENDER,
}: JsonViewerProps) {
  const [renderedCounts, setRenderedCounts] = useState<
    Record<string, number>
  >({});

  const loadMore = useCallback(
    (path: string, total: number) => {
      setRenderedCounts((prev) => ({
        ...prev,
        [path]: Math.min(
          (prev[path] || itemsPerPage) + itemsPerPage,
          total,
        ),
      }));
    },
    [itemsPerPage],
  );

  const getRenderedCount = useCallback(
    (path: string, total: number) => {
      return Math.min(renderedCounts[path] || itemsPerPage, total);
    },
    [renderedCounts, itemsPerPage],
  );

  const LoadMoreButton = ({ path, total, current }: { path: string, total: number, current: number }) => (
    <div className="mt-4 mb-2 flex justify-center">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="h-7 px-4 text-[10px] font-medium transition-all bg-muted/40 hover:bg-muted/60 text-muted-foreground hover:text-foreground border border-border/20"
        onClick={() => loadMore(path, total)}
      >
        <RefreshCw className="mr-2 size-3" />
        Load more
      </Button>
    </div>
  );

  const renderJsonValue = useCallback(
    (
      value: unknown,
      key: string | number,
      path: string,
      depth: number = 0,
      isLast: boolean = true,
    ): React.ReactNode => {
      if (depth >= JSON_PREVIEW_CONFIG.MAX_DEPTH) {
        return (
          <span className="text-muted-foreground/70 italic text-xs">
            ... (max depth)
          </span>
        );
      }

      const currentPath = path === 'root' ? String(key) : `${path}.${key}`;
      const isExpanded = expandedPaths.has(currentPath);
      const suffix = isLast ? '' : ',';

      if (value === null) {
        return (
          <span className="font-mono">
            <span className="text-muted-foreground/50 italic">null</span>
            {suffix}
          </span>
        );
      }

      if (typeof value === 'boolean') {
        return (
          <span className="font-mono">
            <span className="text-orange-500">{String(value)}</span>
            {suffix}
          </span>
        );
      }

      if (typeof value === 'number') {
        return (
          <span className="font-mono">
            <span className="text-purple-500 dark:text-purple-400">
              {String(value)}
            </span>
            {suffix}
          </span>
        );
      }

      if (typeof value === 'string') {
        const truncated =
          value.length > JSON_PREVIEW_CONFIG.MAX_STRING_LENGTH
            ? `${value.slice(0, JSON_PREVIEW_CONFIG.MAX_STRING_LENGTH)}...`
            : value;
        return (
          <span className="font-mono">
            <span className="text-green-600 dark:text-green-400">
              &quot;{truncated}&quot;
            </span>
            {value.length > JSON_PREVIEW_CONFIG.MAX_STRING_LENGTH && (
              <span className="text-muted-foreground/50 text-[10px] ml-1">
                ({value.length}c)
              </span>
            )}
            {suffix}
          </span>
        );
      }

      if (Array.isArray(value)) {
        if (value.length === 0) {
          return (
            <span className="font-mono text-foreground">
              []{suffix}
            </span>
          );
        }

        const itemsToRender = getRenderedCount(currentPath, value.length);
        const hasMore = value.length > itemsToRender;

        return (
          <div className="font-mono">
            <button
              type="button"
              onClick={() => onTogglePath(currentPath)}
              className="text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="size-3" />
              ) : (
                <ChevronRight className="size-3" />
              )}
              <span className="text-foreground">[</span>
              {!isExpanded && (
                <>
                  <span className="text-muted-foreground/50 text-[10px] mx-1">
                    {value.length}
                  </span>
                  <span className="text-foreground">]</span>
                  {suffix}
                </>
              )}
            </button>
            {isExpanded && (
              <div className="ml-5 border-l border-border/40 pl-4">
                {value.slice(0, itemsToRender).map((item, index) => (
                  <div key={index} className="flex items-start">
                    <div className="flex-1">
                      {renderJsonValue(
                        item,
                        index,
                        currentPath,
                        depth + 1,
                        index === value.length - 1 && !hasMore,
                      )}
                    </div>
                  </div>
                ))}
                {hasMore && (
                  <div className="py-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground text-[10px] h-6 py-0 px-2"
                      onClick={() => loadMore(currentPath, value.length)}
                    >
                      ... load {Math.min(itemsPerPage, value.length - itemsToRender)} more
                    </Button>
                  </div>
                )}
              </div>
            )}
            {isExpanded && (
              <div className="text-foreground ml-[15px]">
                ]{suffix}
              </div>
            )}
          </div>
        );
      }

      if (typeof value === 'object') {
        const entries = Object.entries(value);
        if (entries.length === 0) {
          return (
            <span className="font-mono text-foreground">
              {'{' + '}'}
              {suffix}
            </span>
          );
        }

        const itemsToRender = getRenderedCount(currentPath, entries.length);
        const hasMore = entries.length > itemsToRender;

        return (
          <div className="font-mono">
            <button
              type="button"
              onClick={() => onTogglePath(currentPath)}
              className="text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="size-3" />
              ) : (
                <ChevronRight className="size-3" />
              )}
              <span className="text-foreground">{'{'}</span>
              {!isExpanded && (
                <>
                  <span className="text-muted-foreground/50 text-[10px] mx-1">
                    {entries.length}
                  </span>
                  <span className="text-foreground">{'}'}</span>
                  {suffix}
                </>
              )}
            </button>
            {isExpanded && (
              <div className="ml-5 border-l border-border/40 pl-4">
                {entries.slice(0, itemsToRender).map(([k, v], index) => (
                  <div key={k} className="flex items-start gap-1">
                    <span className="text-blue-600 dark:text-blue-400 shrink-0">
                      &quot;{k}&quot;:
                    </span>
                    <div className="flex-1">
                      {renderJsonValue(
                        v,
                        k,
                        currentPath,
                        depth + 1,
                        index === entries.length - 1 && !hasMore,
                      )}
                    </div>
                  </div>
                ))}
                {hasMore && (
                  <div className="py-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground text-[10px] h-6 py-0 px-2"
                      onClick={() => loadMore(currentPath, entries.length)}
                    >
                      ... load more
                    </Button>
                  </div>
                )}
              </div>
            )}
            {isExpanded && (
              <div className="text-foreground ml-[15px]">
                {'}'}
                {suffix}
              </div>
            )}
          </div>
        );
      }

      return (
        <span className="font-mono text-muted-foreground/70">
          {String(value)}
          {suffix}
        </span>
      );
    },
    [expandedPaths, onTogglePath, getRenderedCount, loadMore, itemsPerPage],
  );

  if (viewMode === 'raw') {
    const isArray = Array.isArray(data);
    const isObject = typeof data === 'object' && data !== null;
    const totalItems = isArray
      ? data.length
      : isObject
        ? Object.keys(data).length
        : 0;
    const currentCount = getRenderedCount('root', totalItems);
    const hasMore = totalItems > currentCount;

    let displayData = data;
    if (isArray && hasMore) {
      displayData = data.slice(0, currentCount);
    } else if (isObject && hasMore) {
      displayData = Object.fromEntries(Object.entries(data).slice(0, currentCount));
    }

    return (
      <div className="flex-1 min-h-0 w-full overflow-auto">
        <div className="bg-muted/30 dark:bg-muted/20 min-h-full w-full font-mono text-xs leading-relaxed">
          <div className="">
            <RawJsonViewer data={displayData} isTruncated={hasMore} />
            {hasMore && (
              <LoadMoreButton path="root" total={totalItems} current={currentCount} />
            )}
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'table') {
    const isArray = Array.isArray(data);
    const rows = isArray ? data : [];
    const columns = rows.length > 0 ? Object.keys(rows[0] as object) : [];
    const totalItems = rows.length;
    const currentCount = getRenderedCount('root', totalItems);
    const displayRows = rows.slice(0, currentCount);
    const hasMore = totalItems > currentCount;

    return (
      <div className="flex-1 min-h-0 w-full h-full overflow-hidden flex flex-col">
        <div className="flex-1 h-full overflow-auto flex flex-col">
          {columns.length > 0 ? (
            <div className="flex-1 w-full">
              <div className="overflow-x-auto overflow-y-visible border-b border-border/40">
                <table className="min-w-full divide-y divide-border/40">
                  <thead className="bg-background/50 sticky top-0 z-10 backdrop-blur-md">
                    <tr>
                      {columns.map((col) => (
                        <th
                          key={col}
                          scope="col"
                          className="px-4 py-3 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-r border-border/20 last:border-r-0"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20 bg-transparent">
                    {displayRows.map((row: any, i) => (
                      <tr key={i} className="hover:bg-muted/40 transition-colors">
                        {columns.map((col) => {
                          const val = row[col];
                          const displayValue = val === null
                            ? 'null'
                            : typeof val === 'object'
                              ? JSON.stringify(val)
                              : String(val);
                          const isTruncatable = displayValue.length > 50;

                          return (
                            <td
                              key={col}
                              className="px-4 py-2 text-xs text-foreground/80 border-r border-border/10 last:border-r-0"
                              style={{ maxWidth: '300px' }}
                              title={isTruncatable ? displayValue : undefined}
                            >
                              <div className="truncate">
                                {val === null ? (
                                  <span className="text-muted-foreground/30 italic">null</span>
                                ) : typeof val === 'object' ? (
                                  <span className="text-[10px] text-muted-foreground/60">{JSON.stringify(val)}</span>
                                ) : (
                                  String(val)
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 flex flex-col items-center gap-2 border-t border-border/10 bg-muted/5">
                <span className="text-[10px] text-muted-foreground font-medium">
                  Showing {currentCount} of {totalItems} rows
                </span>
                {hasMore && (
                  <LoadMoreButton path="root" total={totalItems} current={currentCount} />
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="text-muted-foreground text-sm">No tabular data to display</div>
              <Button
                variant="link"
                size="sm"
                className="mt-2 text-xs"
                onClick={() => onViewModeChange?.('tree')}
              >
                Switch to Tree view
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 w-full h-full overflow-auto flex flex-col">
      <div className="min-h-full w-full font-mono text-xs leading-relaxed flex flex-col">
        <div className="flex-1 p-4 space-y-1">
          {Array.isArray(data) ? (
            <div>
              <button
                type="button"
                onClick={() => onTogglePath('root')}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                {expandedPaths.has('root') ? (
                  <ChevronDown className="size-3" />
                ) : (
                  <ChevronRight className="size-3" />
                )}
                <span className="text-foreground">[</span>
                <span className="text-muted-foreground/70 text-xs">
                  {data.length} {data.length === 1 ? 'item' : 'items'}
                </span>
                <span className="text-foreground">]</span>
              </button>
              {expandedPaths.has('root') && (
                <div className="ml-4 mt-1 space-y-0.5 border-l border-border/50 pl-3">
                  {data
                    .slice(0, getRenderedCount('root', data.length))
                    .map((item, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <span className="text-muted-foreground/50 text-xs">
                          {index}:
                        </span>
                        <div className="flex-1">
                          {renderJsonValue(item, index, 'root')}
                        </div>
                      </div>
                    ))}
                  {data.length > getRenderedCount('root', data.length) && (
                    <LoadMoreButton path="root" total={data.length} current={getRenderedCount('root', data.length)} />
                  )}
                </div>
              )}
            </div>
          ) : typeof data === 'object' && data !== null ? (
            <div>
              <button
                type="button"
                onClick={() => onTogglePath('root')}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                {expandedPaths.has('root') ? (
                  <ChevronDown className="size-3" />
                ) : (
                  <ChevronRight className="size-3" />
                )}
                <span className="text-foreground">{'{'}</span>
                <span className="text-muted-foreground/70 text-xs">
                  {Object.keys(data).length}{' '}
                  {Object.keys(data).length === 1 ? 'key' : 'keys'}
                </span>
                <span className="text-foreground">{'}'}</span>
              </button>
              {expandedPaths.has('root') && (
                <div className="ml-4 mt-1 space-y-0.5 border-l border-border/50 pl-3">
                  {Object.entries(data)
                    .slice(0, getRenderedCount('root', Object.keys(data).length))
                    .map(([k, v]) => (
                      <div key={k} className="flex items-start gap-2">
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                          &quot;{k}&quot;:
                        </span>
                        <div className="flex-1">
                          {renderJsonValue(v, k, 'root')}
                        </div>
                      </div>
                    ))}
                  {Object.keys(data).length > getRenderedCount('root', Object.keys(data).length) && (
                    <LoadMoreButton path="root" total={Object.keys(data).length} current={getRenderedCount('root', Object.keys(data).length)} />
                  )}
                </div>
              )}
            </div>
          ) : (
            renderJsonValue(data, 'root', 'root')
          )}
        </div>
      </div>
    </div>
  );
}
