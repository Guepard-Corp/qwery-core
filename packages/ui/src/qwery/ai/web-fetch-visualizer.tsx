'use client';

import * as React from 'react';
import { Globe, ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ToolVariant } from '../../ai-elements/tool';

export type SearchEngine =
  | 'google'
  | 'bing'
  | 'duckduckgo'
  | 'baidu'
  | 'yandex'
  | 'yahoo';

export const SEARCH_ENGINES: Record<SearchEngine, { name: string }> = {
  google: { name: 'Google' },
  bing: { name: 'Bing' },
  duckduckgo: { name: 'DuckDuckGo' },
  baidu: { name: 'Baidu' },
  yandex: { name: 'Yandex' },
  yahoo: { name: 'Yahoo' },
};

const SEARCH_ENGINE_ICON_URLS: Record<SearchEngine, string> = {
  google: 'https://www.google.com/favicon.ico',
  bing: 'https://www.bing.com/sa/simg/favicon-trans-bg-blue-mg.ico',
  duckduckgo: 'https://duckduckgo.com/favicon.ico',
  baidu: 'https://www.baidu.com/favicon.ico',
  yandex: 'https://yandex.com/favicon.ico',
  yahoo: 'https://s.yimg.com/rz/l/favicon.ico',
};

export function SearchEngineIcon({
  engine,
  className,
}: {
  engine: SearchEngine;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'bg-muted flex h-4 w-4 shrink-0 items-center justify-center rounded-sm',
        className,
      )}
      aria-hidden
    >
      <img
        src={SEARCH_ENGINE_ICON_URLS[engine]}
        alt={SEARCH_ENGINES[engine].name}
        className="h-3 w-3 rounded-[2px]"
      />
    </span>
  );
}

export const SEARCH_ENGINE_IDS: readonly SearchEngine[] = [
  'google',
  'bing',
  'duckduckgo',
  'baidu',
  'yandex',
  'yahoo',
] as const;

export function isSearchEngine(s: string): s is SearchEngine {
  return (SEARCH_ENGINE_IDS as readonly string[]).includes(s);
}

export interface WebFetchVisualizerProps {
  /** The full URL of the web page */
  url: string;
  /** The format of the content (if available) */
  format?: 'text' | 'markdown' | 'html';
  /** Optional output string (not used in current minimal/metadata-only design) */
  output?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether the tool is currently streaming/loading */
  isStreaming?: boolean;
  /** UI variant (default or minimal) */
  variant?: ToolVariant;
}

/**
 * Utility to extract search engine and query from a URL (exported for minimal tool row)
 */
export function getUrlMetadata(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace('www.', '');

    let engine: SearchEngine | undefined;
    if (host.includes('google')) engine = 'google';
    else if (host.includes('duckduckgo')) engine = 'duckduckgo';
    else if (host.includes('bing')) engine = 'bing';
    else if (host.includes('baidu')) engine = 'baidu';
    else if (host.includes('yandex')) engine = 'yandex';
    else if (host.includes('yahoo')) engine = 'yahoo';

    const params = parsed.searchParams;
    // Common query parameters across engines
    const query =
      params.get('q') ||
      params.get('query') ||
      params.get('p') ||
      params.get('s') ||
      params.get('text') ||
      params.get('wd');

    return {
      host: host.split('.')[0] || host,
      domain: host,
      engine,
      searchQuery: query ? decodeURIComponent(query).replace(/\+/g, ' ') : null,
      isValid: true,
    };
  } catch {
    return {
      host: 'Web Page',
      domain: '',
      engine: undefined,
      searchQuery: null,
      isValid: false,
    };
  }
}

export const WebFetchVisualizer = React.memo(function WebFetchVisualizer({
  url,
  className,
  isStreaming = false,
  variant = 'default',
}: WebFetchVisualizerProps) {
  const isMinimal = variant === 'minimal';

  const metadata = React.useMemo(() => getUrlMetadata(url), [url]);

  const faviconUrl = metadata.domain
    ? `https://www.google.com/s2/favicons?domain=${metadata.domain}&sz=64`
    : null;

  // Final label to display (Search String > Hostname)
  const displayLabel = metadata.searchQuery || metadata.host;

  if (isMinimal) {
    return (
      <div className={cn('flex items-center gap-2 py-0.5', className)}>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="group flex max-w-full min-w-0 items-center gap-2.5 opacity-80 transition-all hover:opacity-100"
        >
          <div className="flex min-w-0 items-center gap-2">
            {metadata.engine ? (
              <SearchEngineIcon
                engine={metadata.engine}
                className="size-3.5 shrink-0"
              />
            ) : null}
            {faviconUrl ? (
              <img
                src={faviconUrl}
                alt=""
                className="h-4 w-4 shrink-0 rounded-sm opacity-70 grayscale transition-all group-hover:opacity-100 group-hover:grayscale-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <Globe className="text-muted-foreground/60 h-4 w-4 shrink-0" />
            )}
            <span className="text-foreground/90 group-hover:text-primary truncate text-[13px] font-bold tracking-tight transition-colors">
              {displayLabel}
            </span>
          </div>
          <ExternalLink className="text-muted-foreground group-hover:text-primary h-3 w-3 shrink-0 transition-colors" />
        </a>
      </div>
    );
  }

  return (
    <div className={cn('flex w-full flex-col', className)}>
      <div className="group border-border/60 bg-card hover:border-border relative overflow-hidden rounded-xl border shadow-sm transition-colors">
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <div className="bg-muted/50 text-primary border-border/50 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border">
                {faviconUrl ? (
                  <img
                    src={faviconUrl}
                    alt=""
                    className="h-6 w-6 rounded object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <Globe className="h-5 w-5" />
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                <span className="text-foreground truncate text-sm font-semibold tracking-tight">
                  {displayLabel}
                </span>
                <div className="text-muted-foreground flex items-center gap-1.5">
                  <div
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      isStreaming
                        ? 'animate-pulse bg-amber-500'
                        : 'bg-emerald-500',
                    )}
                  />
                  <span className="truncate text-[10px] font-medium tracking-wider uppercase">
                    {metadata.engine || metadata.domain || 'Web'}
                  </span>
                </div>
              </div>
            </div>

            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:text-foreground hover:bg-muted/70 flex size-8 shrink-0 items-center justify-center rounded-md transition-colors"
              aria-label="Open in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
});
