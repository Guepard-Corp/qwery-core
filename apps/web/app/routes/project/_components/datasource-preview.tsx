'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useCallback,
} from 'react';
import { useTheme } from 'next-themes';
import {
  ExternalLink,
  RefreshCw,
  FileJson,
  Copy,
  Check,
  Info,
  Loader2,
} from 'lucide-react';
import { cn } from '@qwery/ui/utils';
import { Button } from '@qwery/ui/button';
import {
  getDatasourcePreviewUrl,
  validateDatasourceUrl,
  getDatasourceType,
} from '~/lib/utils/datasource-utils';
import {
  detectPublishedState,
  type PublicationStatus,
} from '~/lib/utils/google-sheets-preview';
import { fetchJsonData } from '~/lib/utils/json-preview-utils';
import { fetchParquetData, fetchCsvData } from '~/lib/utils/data-preview-utils';

import { DatasourcePublishingGuide } from './datasource-publishing-guide';
import { JsonViewer, type JsonViewMode } from './json-viewer';

export interface DatasourcePreviewRef {
  refresh: () => void;
}

export const DatasourcePreview = forwardRef<
  DatasourcePreviewRef,
  {
    formValues: Record<string, unknown> | null;
    extensionId: string;
    formConfig?: {
      preset?: string;
      connectionFieldKind?: string;
      supportsPreview?: boolean;
    } | null;
    className?: string;
    isTestConnectionLoading?: boolean;
  }
>(function DatasourcePreview(
  {
    formValues,
    extensionId,
    formConfig,
    className,
    isTestConnectionLoading: _isTestConnectionLoading = false,
  },
  _ref,
) {
  const { theme, resolvedTheme } = useTheme();
  const previewUrl = useMemo(
    () => getDatasourcePreviewUrl(formValues, extensionId, formConfig),
    [formValues, extensionId, formConfig],
  );
  const dsType = getDatasourceType(extensionId);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [debouncedPreviewUrl, setDebouncedPreviewUrl] = useState<string | null>(
    previewUrl,
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [publicationStatus, setPublicationStatus] =
    useState<PublicationStatus>('unknown');
  const [isIframeLoading, setIsIframeLoading] = useState(false);
  const [jsonData, setJsonData] = useState<unknown>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isLoadingJson, setIsLoadingJson] = useState(false);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<JsonViewMode>('table');
  const [isWasmFallbackRequested, setIsWasmFallbackRequested] = useState(false);
  const [showPublishingGuide, setShowPublishingGuide] = useState(false);

  // Set initial view mode based on type
  useEffect(() => {
    if (dsType === 'json') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setViewMode('tree');
    } else {
      setViewMode('table');
    }
  }, [dsType]);

  // Debounce preview URL updates by 1 second
  useEffect(() => {
    if (!previewUrl) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDebouncedPreviewUrl(null);
      setPublicationStatus('unknown');
      return;
    }

    const timeoutId = setTimeout(() => {
      setDebouncedPreviewUrl(previewUrl);
      setRefreshKey((prev) => prev + 1);
      setIsIframeLoading(true);
      setIsWasmFallbackRequested(false);
      setShowPublishingGuide(false);
      setJsonData(null);
      setJsonError(null);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [previewUrl]);

  // Delay publishing guide appearance
  useEffect(() => {
    if (extensionId === 'gsheet-csv' && publicationStatus === 'not-published') {
      const timer = setTimeout(() => setShowPublishingGuide(true), 2500);
      return () => clearTimeout(timer);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowPublishingGuide(false);
    }
  }, [extensionId, publicationStatus]);

  // Detect publication status for Google Sheets
  useEffect(() => {
    if (extensionId !== 'gsheet-csv' || !previewUrl) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPublicationStatus('unknown');
      return;
    }

    const sharedLink = (formValues?.sharedLink || formValues?.url) as
      | string
      | undefined;
    if (!sharedLink || typeof sharedLink !== 'string') {
      setPublicationStatus('unknown');
      return;
    }

    setPublicationStatus('checking');
    detectPublishedState(sharedLink)
      .then((status) => {
        setPublicationStatus(status);
      })
      .catch(() => {
        setPublicationStatus('unknown');
      });
  }, [extensionId, previewUrl, formValues]);

  // Use unified validation logic
  useEffect(() => {
    const sharedLink = (formValues?.sharedLink || formValues?.url) as
      | string
      | undefined;
    const { error } = validateDatasourceUrl(extensionId, sharedLink);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValidationError(error);
  }, [extensionId, formValues]);

  // Fetch data for JSON, Parquet, or CSV preview
  useEffect(() => {
    const isJson = extensionId === 'json-online';
    const isParquet = extensionId === 'parquet-online';
    const isGsheetCsv = extensionId === 'gsheet-csv';

    // For GSheet - we only try WASM/CSV if it's NOT a Google Sheet link (i.e. direct CSV)
    // OR if we specifically want to try the fallback (user's request)
    const isGSheetLink =
      isGsheetCsv &&
      debouncedPreviewUrl?.includes('docs.google.com/spreadsheets');
    const isDirectCsv = isGsheetCsv && !isGSheetLink;

    if ((!isJson && !isParquet && !isDirectCsv) || !debouncedPreviewUrl) {
      if (!isGSheetLink) {
        // Don't clear if we might need gsheet data later
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setJsonData(null);
        setJsonError(null);
        setIsLoadingJson(false);
      }
      return;
    }

    setIsLoadingJson(true);
    setJsonError(null);

    let fetcher;
    if (isJson) fetcher = fetchJsonData(debouncedPreviewUrl);
    else if (isParquet) fetcher = fetchParquetData(debouncedPreviewUrl);
    else fetcher = fetchCsvData(debouncedPreviewUrl);

    fetcher
      .then((result) => {
        if (result.error) {
          setJsonError(result.error);
          setJsonData(null);
        } else {
          setJsonData(result.data);
          setExpandedPaths(new Set(['root']));
        }
      })
      .finally(() => {
        setIsLoadingJson(false);
      });
  }, [extensionId, debouncedPreviewUrl, refreshKey]);

  // Special effect for Google Sheet WASM fallback
  useEffect(() => {
    if (
      extensionId !== 'gsheet-csv' ||
      publicationStatus !== 'not-published' ||
      !debouncedPreviewUrl ||
      !isWasmFallbackRequested
    ) {
      return;
    }

    // Convert to CSV export URL for WASM try
    const gSheetIdMatch = debouncedPreviewUrl.match(
      /\/spreadsheets\/d\/(e\/)?([a-zA-Z0-9-_]{20,})/,
    );
    if (!gSheetIdMatch) return;

    const sheetId = gSheetIdMatch[2];
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingJson(true);
    setJsonError(null); // Clear any previous error
    fetchCsvData(csvUrl)
      .then((result) => {
        if (!result.error && result.data) {
          setJsonData(result.data);
          setExpandedPaths(new Set(['root']));
        } else if (result.error) {
          setJsonError(result.error);
        }
      })
      .finally(() => {
        setIsLoadingJson(false);
      });
  }, [
    extensionId,
    publicationStatus,
    debouncedPreviewUrl,
    isWasmFallbackRequested,
  ]);

  const handleRefresh = () => {
    setIsIframeLoading(true);
    setRefreshKey((prev) => prev + 1);
    if (iframeRef.current) {
      // eslint-disable-next-line no-self-assign
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const handleIframeLoad = () => {
    setIsIframeLoading(false);
  };

  const togglePath = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleCopyJson = useCallback(async () => {
    if (jsonData === null) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy JSON:', error);
    }
  }, [jsonData]);

  // Get theme for iframe (try to inject, though Google Sheets may not respect it)
  const currentTheme = resolvedTheme || theme || 'light';
  const themeParam = currentTheme === 'dark' ? '&theme=dark' : '';

  const baseUrl: string | undefined =
    debouncedPreviewUrl ?? previewUrl ?? undefined;
  const displayUrl: string | undefined = baseUrl
    ? baseUrl +
      (baseUrl.includes('?')
        ? '&' + themeParam.substring(1)
        : '?' + themeParam.substring(1))
    : undefined;

  const isGoogleSheets = dsType === 'gsheet';
  const isJsonOnline = dsType === 'json';
  const isParquetOnline = dsType === 'parquet';

  const supportsPreview = formConfig?.supportsPreview === true;
  const hasValidUrl = Boolean(previewUrl) && !validationError;
  const hasPreview = Boolean(debouncedPreviewUrl) && !validationError;

  // Early return if datasource doesn't support preview
  if (!supportsPreview) {
    return null;
  }

  if (!hasValidUrl) {
    if (validationError) {
      return (
        <div
          className={cn(
            'border-destructive/20 bg-destructive/5 flex flex-col items-center justify-center rounded-xl border px-6 py-8 text-center shadow-sm',
            className,
          )}
        >
          <div className="bg-destructive/10 mb-3 flex h-12 w-12 items-center justify-center rounded-full">
            <FileJson className="text-destructive size-6" />
          </div>
          <h4 className="text-foreground text-sm font-semibold">
            Connection Required
          </h4>
          <p className="text-muted-foreground mt-1 max-w-xs text-xs leading-relaxed">
            {validationError}
          </p>
        </div>
      );
    }

    return null;
  }

  return (
    <div className={cn('flex flex-col space-y-3', className)}>
      {/* Preview subtitle label */}
      {hasPreview && (
        <div className="shrink-0">
          <h3 className="text-foreground text-sm font-semibold">Preview</h3>
        </div>
      )}

      {/* Preview container - flex-1 to take available height */}
      {hasPreview && (
        <div className="group border-border bg-muted/30 dark:bg-muted/25 relative flex min-h-[300px] flex-1 flex-col overflow-hidden rounded-lg border transition-colors duration-300">
          <div className="relative flex h-full min-h-0 w-full flex-1 flex-col">
            {isJsonOnline ||
            isParquetOnline ||
            (dsType === 'gsheet' && !!jsonData) ? (
              <div className="relative flex min-h-0 flex-1 flex-col items-stretch overflow-hidden">
                {isLoadingJson ? (
                  <div className="bg-muted/30 dark:bg-muted/20 flex h-full w-full items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="border-muted-foreground/20 border-t-muted-foreground size-8 animate-spin rounded-full border-2" />
                      <div className="text-foreground text-center text-sm font-medium">
                        {isParquetOnline
                          ? 'Preparing Parquet Preview...'
                          : dsType === 'gsheet'
                            ? 'Preparing Data Preview...'
                            : 'Loading JSON Preview...'}
                      </div>
                      <div className="text-muted-foreground px-4 text-center text-xs">
                        {isParquetOnline || dsType === 'gsheet'
                          ? 'Preparing data view'
                          : 'Fetching data from URL'}
                      </div>
                    </div>
                  </div>
                ) : jsonError && !isGoogleSheets ? (
                  <div className="bg-background flex h-full w-full items-center justify-center p-6">
                    <div className="flex max-w-sm flex-col items-center text-center">
                      <div className="bg-destructive/10 mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
                        <FileJson className="text-destructive size-8" />
                      </div>
                      <h4 className="text-foreground text-lg font-semibold">
                        {isParquetOnline
                          ? 'Failed to load Parquet'
                          : 'Failed to load JSON'}
                      </h4>
                      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                        {jsonError}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-6"
                        onClick={handleRefresh}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Try again
                      </Button>
                    </div>
                  </div>
                ) : jsonData ? (
                  <div className="animate-in fade-in zoom-in-95 flex min-h-0 w-full flex-1 flex-col duration-500">
                    <JsonViewer
                      data={jsonData}
                      expandedPaths={expandedPaths}
                      onTogglePath={togglePath}
                      viewMode={viewMode}
                      onViewModeChange={setViewMode}
                      itemsPerPage={
                        isParquetOnline || dsType === 'gsheet' ? 20 : undefined
                      }
                    />
                  </div>
                ) : null}
              </div>
            ) : isGoogleSheets &&
              publicationStatus === 'not-published' &&
              !jsonData ? (
              <div className="bg-muted/30 flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-3 px-6 text-center">
                  <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
                    <Info className="size-8 text-amber-600 dark:text-amber-500" />
                  </div>
                  <div className="text-foreground text-sm font-semibold">
                    Preview Not Available Yet
                  </div>
                  <div className="text-muted-foreground max-w-xs text-xs">
                    Google requires sheets to be &quot;Published to the
                    web&quot; to be viewed inside other applications.
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-background/50 mt-4 h-8 border-dashed text-[11px] transition-all hover:border-solid"
                    onClick={() => setIsWasmFallbackRequested(true)}
                    disabled={isLoadingJson}
                  >
                    {isLoadingJson ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Analyzing Spreadsheet...
                      </>
                    ) : (
                      'Try Direct Data Preview'
                    )}
                  </Button>

                  {!isLoadingJson && showPublishingGuide && (
                    <p className="text-muted-foreground animate-in fade-in slide-in-from-bottom-2 mt-4 text-[10px] italic duration-700">
                      Follow the instructions below to enable the live preview.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative min-h-0 flex-1">
                <iframe
                  key={refreshKey}
                  ref={iframeRef}
                  src={displayUrl}
                  className={cn(
                    'size-full border-0',
                    isGoogleSheets &&
                      currentTheme === 'dark' &&
                      'brightness-[0.9] contrast-[1.1] hue-rotate-180 invert-[0.85]',
                  )}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
                  title="Datasource preview"
                  allow="clipboard-read; clipboard-write"
                  onLoad={handleIframeLoad}
                />
                {isIframeLoading && (
                  <div className="bg-background/80 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-3">
                      <div className="border-muted-foreground/20 border-t-muted-foreground size-6 animate-spin rounded-full border-2" />
                      <div className="text-muted-foreground text-xs">
                        Loading preview...
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bottom-Left Utility Controls (Hover only) */}
            {(!!jsonData ||
              (isGoogleSheets &&
                publicationStatus === 'published' &&
                !validationError)) && (
              <div className="pointer-events-auto absolute bottom-3 left-3 z-30 flex items-center gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground/70 hover:text-foreground bg-background/90 border-border/40 h-7 w-7 border backdrop-blur-sm"
                  onClick={handleRefresh}
                  title="Refresh preview"
                >
                  <RefreshCw className="size-3.5" />
                </Button>
                {displayUrl && (
                  <a
                    href={displayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground/70 hover:text-foreground bg-background/90 border-border/40 flex h-7 w-7 items-center justify-center rounded border backdrop-blur-sm transition-colors"
                    title="Open in new tab"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                )}
                {(isJsonOnline ||
                  isParquetOnline ||
                  (dsType === 'gsheet' && !!jsonData)) &&
                  jsonData !== null &&
                  !isLoadingJson &&
                  !jsonError && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground/70 hover:text-foreground bg-background/90 border-border/40 h-7 w-7 border backdrop-blur-sm"
                      onClick={handleCopyJson}
                      title={
                        isParquetOnline ? 'Copy rows as JSON' : 'Copy JSON'
                      }
                    >
                      {copied ? (
                        <Check className="size-3.5" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </Button>
                  )}
              </div>
            )}

            {/* Bottom-Right Controls: View Mode Toggles (Tree/Raw) */}
            {(isJsonOnline ||
              isParquetOnline ||
              (dsType === 'gsheet' && !!jsonData)) &&
              jsonData !== null &&
              !isLoadingJson &&
              !jsonError && (
                <div className="pointer-events-auto absolute right-3 bottom-3 z-30 flex items-center">
                  <div className="border-border/40 bg-background/60 mr-2 flex items-center gap-0.5 rounded-md border p-0.5 shadow-sm backdrop-blur-md">
                    {(isParquetOnline ||
                      (dsType === 'gsheet' && !!jsonData)) && (
                      <Button
                        variant={viewMode === 'table' ? 'default' : 'ghost'}
                        size="sm"
                        className={cn(
                          'h-6 rounded-[4px] px-2 text-[10px] font-medium transition-all',
                          viewMode === 'table'
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                        onClick={() => setViewMode('table')}
                      >
                        Table
                      </Button>
                    )}
                    {dsType === 'json' && (
                      <Button
                        variant={viewMode === 'tree' ? 'default' : 'ghost'}
                        size="sm"
                        className={cn(
                          'h-6 rounded-[4px] px-2 text-[10px] font-medium transition-all',
                          viewMode === 'tree'
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                        onClick={() => setViewMode('tree')}
                      >
                        Tree
                      </Button>
                    )}
                    <Button
                      variant={viewMode === 'raw' ? 'default' : 'ghost'}
                      size="sm"
                      className={cn(
                        'h-6 rounded-[4px] px-2 text-[10px] font-medium transition-all',
                        viewMode === 'raw'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                      onClick={() => setViewMode('raw')}
                    >
                      Raw
                    </Button>
                  </div>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Publishing instructions card below */}
      {isGoogleSheets && showPublishingGuide && !jsonData && (
        <div
          className={cn(
            'shrink-0 transition-all duration-500 ease-out',
            publicationStatus === 'checking' ||
              publicationStatus === 'published'
              ? 'pointer-events-none max-h-0 translate-y-2 overflow-hidden opacity-0'
              : 'translate-y-0 opacity-100',
          )}
        >
          <DatasourcePublishingGuide
            isPublished={
              publicationStatus === 'published'
                ? true
                : publicationStatus === 'not-published'
                  ? false
                  : null
            }
            isChecking={publicationStatus === 'checking'}
          />
        </div>
      )}
    </div>
  );
});
