import {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useCallback,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import {
  ExternalLink,
  RefreshCw,
  FileJson,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';
import { cn } from '@qwery/ui/utils';
import { Button } from '@qwery/ui/button';
import {
  getDatasourcePreviewUrl,
  getUrlForValidation,
  validateDatasourceUrl,
  isGsheetLikeUrl,
  type DatasourceExtensionMeta,
} from '~/lib/utils/datasource-utils';
import {
  detectPublishedState,
  type PublicationStatus,
} from '~/lib/utils/google-sheets-preview';
import { fetchJsonData } from '~/lib/utils/json-preview-utils';
import { fetchParquetData, fetchCsvData } from '~/lib/utils/data-preview-utils';
import { DatasourcePublishingGuide } from './datasource-publishing-guide';
import { JsonViewer, type JsonViewMode } from './json-viewer';

const PREVIEW_REVEAL_DELAY_MS = 2500;

function getPreviewTitle(
  meta: DatasourceExtensionMeta | undefined | null,
): string {
  if (!meta) return 'Preview';
  const id = meta.id ?? '';
  const format = meta.previewDataFormat;
  const kind = meta.previewUrlKind;
  if (id === 'gsheet-csv' || kind === 'embeddable')
    return 'Google Sheets preview';
  if (kind === 'data-file') {
    if (format === 'json') return 'JSON preview';
    if (format === 'parquet') return 'Parquet preview';
    if (format === 'csv') return 'CSV preview';
    return 'Data preview';
  }
  return 'Preview';
}

export interface DatasourcePreviewRef {
  refresh: () => void;
}

export const DatasourcePreview = forwardRef<
  DatasourcePreviewRef,
  {
    formValues: Record<string, unknown> | null;
    extensionMeta: DatasourceExtensionMeta | undefined | null;
    className?: string;
    isTestConnectionLoading?: boolean;
  }
>(function DatasourcePreview(
  {
    formValues,
    extensionMeta,
    className,
    isTestConnectionLoading: _isTestConnectionLoading = false,
  },
  ref,
) {
  const { t } = useTranslation('common');
  const { theme, resolvedTheme } = useTheme();
  const supportsPreviewProp = extensionMeta?.supportsPreview === true;
  const previewUrl = useMemo(
    () => getDatasourcePreviewUrl(formValues, extensionMeta),
    [formValues, extensionMeta],
  );
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [previewState, setPreviewState] = useState({
    refreshKey: 0,
    isIframeLoading: false,
    previewRevealReady: false,
    publicationStatus: 'unknown' as PublicationStatus,
    isWasmFallbackRequested: false,
  });

  const [dataState, setDataState] = useState({
    jsonData: null as unknown,
    jsonError: null as string | null,
    isLoadingJson: false,
    expandedPaths: new Set<string>() as Set<string>,
    copied: false,
    viewMode: 'table' as JsonViewMode,
  });

  const refreshKey = previewState.refreshKey;
  const isIframeLoading = previewState.isIframeLoading;
  const previewRevealReady = previewState.previewRevealReady;
  const publicationStatus = previewState.publicationStatus;
  const isWasmFallbackRequested = previewState.isWasmFallbackRequested;
  const jsonData = dataState.jsonData;
  const jsonError = dataState.jsonError;
  const isLoadingJson = dataState.isLoadingJson;
  const expandedPaths = dataState.expandedPaths;
  const copied = dataState.copied;
  const viewMode = dataState.viewMode;

  const validationError = useMemo(() => {
    const url = getUrlForValidation(formValues ?? null, extensionMeta);
    return validateDatasourceUrl(extensionMeta, url).error ?? null;
  }, [extensionMeta, formValues]);

  const needsPublicationCheck =
    extensionMeta?.previewUrlKind === 'embeddable' &&
    isGsheetLikeUrl(previewUrl);
  const showPublishingGuide =
    needsPublicationCheck && publicationStatus === 'not-published';

  useEffect(() => {
    const next = extensionMeta?.previewDataFormat === 'json' ? 'tree' : 'table';
    queueMicrotask(() =>
      setDataState((d) => ({ ...d, viewMode: next as JsonViewMode })),
    );
  }, [extensionMeta?.previewDataFormat]);

  useEffect(() => {
    if (!previewUrl) {
      queueMicrotask(() =>
        setPreviewState((p) => ({ ...p, publicationStatus: 'unknown' })),
      );
      return;
    }
    queueMicrotask(() => {
      setPreviewState((p) => ({
        ...p,
        refreshKey: p.refreshKey + 1,
        isIframeLoading: true,
        isWasmFallbackRequested: false,
      }));
      setDataState((d) => ({
        ...d,
        jsonData: null,
        jsonError: null,
      }));
    });
  }, [previewUrl, extensionMeta?.previewUrlKind]);

  useEffect(() => {
    if (!previewUrl) {
      queueMicrotask(() =>
        setPreviewState((p) => ({ ...p, previewRevealReady: false })),
      );
      return;
    }
    if (!needsPublicationCheck) {
      queueMicrotask(() =>
        setPreviewState((p) => ({ ...p, previewRevealReady: true })),
      );
      return;
    }
    queueMicrotask(() =>
      setPreviewState((p) => ({ ...p, previewRevealReady: false })),
    );
    const timer = setTimeout(() => {
      setPreviewState((p) => ({ ...p, previewRevealReady: true }));
    }, PREVIEW_REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [previewUrl, needsPublicationCheck]);

  useEffect(() => {
    if (!needsPublicationCheck || !previewUrl) {
      queueMicrotask(() =>
        setPreviewState((p) => ({ ...p, publicationStatus: 'unknown' })),
      );
      return;
    }

    const sharedLink = (formValues?.sharedLink || formValues?.url) as
      | string
      | undefined;
    if (!sharedLink || typeof sharedLink !== 'string') {
      queueMicrotask(() =>
        setPreviewState((p) => ({ ...p, publicationStatus: 'unknown' })),
      );
      return;
    }

    queueMicrotask(() =>
      setPreviewState((p) => ({ ...p, publicationStatus: 'checking' })),
    );
    detectPublishedState(sharedLink)
      .then((status) => {
        setPreviewState((p) => ({ ...p, publicationStatus: status }));
      })
      .catch(() => {
        setPreviewState((p) => ({ ...p, publicationStatus: 'unknown' }));
      });
  }, [needsPublicationCheck, previewUrl, formValues]);

  const needsDataFetching = extensionMeta?.previewUrlKind === 'data-file';
  const dataFormat = extensionMeta?.previewDataFormat;

  useEffect(() => {
    if (!needsDataFetching || !previewUrl) {
      if (!isGsheetLikeUrl(previewUrl)) {
        queueMicrotask(() =>
          setDataState((d) => ({
            ...d,
            jsonData: null,
            jsonError: null,
            isLoadingJson: false,
          })),
        );
      }
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    const gsheet = isGsheetLikeUrl(previewUrl);
    const isDirectCsv = dataFormat === 'csv' && !gsheet;
    if (!isDirectCsv && dataFormat !== 'json' && dataFormat !== 'parquet') {
      return () => controller.abort();
    }

    queueMicrotask(() => {
      if (signal.aborted) return;
      setDataState((d) => ({ ...d, isLoadingJson: true, jsonError: null }));
    });

    const fetcher =
      dataFormat === 'json'
        ? fetchJsonData(previewUrl)
        : dataFormat === 'parquet'
          ? fetchParquetData(previewUrl)
          : fetchCsvData(previewUrl);

    fetcher
      .then((result) => {
        if (signal.aborted) return;
        if (result.error) {
          setDataState((d) => ({
            ...d,
            jsonError: result.error,
            jsonData: null,
          }));
        } else {
          setDataState((d) => ({
            ...d,
            jsonData: result.data,
            expandedPaths: new Set(['root']),
          }));
        }
      })
      .finally(() => {
        if (signal.aborted) return;
        setDataState((d) => ({ ...d, isLoadingJson: false }));
      });

    return () => controller.abort();
  }, [previewUrl, refreshKey, needsDataFetching, dataFormat, t]);

  useEffect(() => {
    if (
      !needsPublicationCheck ||
      publicationStatus !== 'not-published' ||
      !previewUrl ||
      !isWasmFallbackRequested
    ) {
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    const gSheetIdMatch = previewUrl.match(
      /\/spreadsheets\/d\/(e\/)?([a-zA-Z0-9-_]{20,})/,
    );
    if (!gSheetIdMatch) return () => controller.abort();

    const sheetId = gSheetIdMatch[2];
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

    queueMicrotask(() =>
      setDataState((d) => ({ ...d, isLoadingJson: true, jsonError: null })),
    );
    fetchCsvData(csvUrl)
      .then((result) => {
        if (signal.aborted) return;
        if (!result.error && result.data) {
          setDataState((d) => ({
            ...d,
            jsonData: result.data,
            expandedPaths: new Set(['root']),
          }));
        } else if (result.error) {
          setDataState((d) => ({
            ...d,
            jsonError: result.error,
          }));
        }
      })
      .finally(() => {
        if (signal.aborted) return;
        setDataState((d) => ({ ...d, isLoadingJson: false }));
      });

    return () => controller.abort();
  }, [
    needsPublicationCheck,
    publicationStatus,
    previewUrl,
    isWasmFallbackRequested,
    t,
  ]);

  const handleRefresh = useCallback(() => {
    setPreviewState((p) => ({
      ...p,
      isIframeLoading: true,
      refreshKey: p.refreshKey + 1,
    }));
    if (iframeRef.current) {
      // Force iframe reload by reassigning src
      // eslint-disable-next-line no-self-assign -- intentional refresh
      iframeRef.current.src = iframeRef.current.src;
    }
  }, []);

  useImperativeHandle(ref, () => ({ refresh: handleRefresh }), [handleRefresh]);

  const handleIframeLoad = useCallback(() => {
    setPreviewState((p) => ({ ...p, isIframeLoading: false }));
  }, []);

  const togglePath = useCallback((path: string) => {
    setDataState((d) => {
      const next = new Set(d.expandedPaths);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return { ...d, expandedPaths: next };
    });
  }, []);

  const setViewMode = useCallback((mode: JsonViewMode) => {
    setDataState((d) => ({ ...d, viewMode: mode }));
  }, []);

  const handleCopyJson = useCallback(async () => {
    if (jsonData === null) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
      setDataState((d) => ({ ...d, copied: true }));
      setTimeout(() => setDataState((d) => ({ ...d, copied: false })), 2000);
    } catch (error) {
      console.error('Failed to copy JSON:', error);
    }
  }, [jsonData]);

  // Get theme for iframe (try to inject, though Google Sheets may not respect it)
  const currentTheme = resolvedTheme || theme || 'light';
  const themeParam = currentTheme === 'dark' ? '&theme=dark' : '';

  const iframeBaseUrl: string | null = useMemo(() => {
    if (!previewUrl) return null;
    return previewUrl;
  }, [previewUrl]);

  const displayUrl: string | undefined = iframeBaseUrl
    ? themeParam
      ? iframeBaseUrl +
        (iframeBaseUrl.includes('?') ? '&' : '?') +
        themeParam.substring(1)
      : iframeBaseUrl
    : undefined;

  const supportsPreview = supportsPreviewProp === true;
  const extensionId = extensionMeta?.id ?? null;
  const usesJsonFormat = dataFormat === 'json' || extensionId === 'json-online';
  const usesParquetFormat = dataFormat === 'parquet';
  const usesCsvFormat =
    (dataFormat === 'csv' || extensionId === 'csv-online') &&
    !needsPublicationCheck;
  const hasValidUrl = Boolean(previewUrl) && !validationError;

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

  const showWasmTableView =
    usesJsonFormat ||
    usesParquetFormat ||
    usesCsvFormat ||
    (needsPublicationCheck && (!!jsonData || isWasmFallbackRequested));

  const showPublishingGuideCollapsible =
    hasValidUrl &&
    previewRevealReady &&
    showPublishingGuide &&
    !jsonData &&
    !isWasmFallbackRequested;

  return (
    <div className={cn('flex flex-col space-y-3', className)}>
      {/* Guide only when sheet is not published; hidden when published so iframe is shown without it */}
      {showPublishingGuideCollapsible && (
        <div className="shrink-0 space-y-2">
          <DatasourcePublishingGuide isPublished={false} isChecking={false} />
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-dashed text-[11px]"
              onClick={() =>
                setPreviewState((p) => ({
                  ...p,
                  isWasmFallbackRequested: true,
                }))
              }
              disabled={isLoadingJson}
            >
              {isLoadingJson ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Analyzing…
                </>
              ) : (
                'Try Direct Data Preview'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* During delay: full-width loading (same as preview container) */}
      {hasValidUrl && !previewRevealReady && (
        <div className="group border-border bg-muted/30 dark:bg-muted/25 relative flex min-h-[300px] flex-1 flex-col overflow-hidden rounded-lg border transition-colors duration-300">
          <div className="flex flex-1 items-center justify-center">
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Checking preview availability…
            </p>
          </div>
        </div>
      )}

      {hasValidUrl && previewRevealReady && (
        <div className="shrink-0">
          <h3 className="text-foreground text-sm font-semibold">
            {getPreviewTitle(extensionMeta)}
          </h3>
        </div>
      )}

      {hasValidUrl && previewRevealReady && (
        <div className="group border-border bg-muted/30 dark:bg-muted/25 relative flex min-h-[300px] flex-1 flex-col overflow-hidden rounded-lg border transition-colors duration-300">
          <div className="relative flex h-full min-h-0 w-full flex-1 flex-col">
            {showWasmTableView ? (
              <div className="relative flex min-h-0 flex-1 flex-col items-stretch overflow-hidden">
                {isLoadingJson ? (
                  <div className="bg-muted/30 dark:bg-muted/20 flex h-full w-full items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="border-muted-foreground/20 border-t-muted-foreground size-8 animate-spin rounded-full border-2" />
                    </div>
                  </div>
                ) : jsonError && !needsPublicationCheck ? (
                  <div className="bg-background flex h-full w-full items-center justify-center p-6">
                    <div className="flex max-w-sm flex-col items-center text-center">
                      <div className="bg-destructive/10 mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
                        <FileJson className="text-destructive size-8" />
                      </div>
                      <h4 className="text-foreground text-lg font-semibold">
                        {usesParquetFormat
                          ? 'Failed to load Parquet'
                          : usesCsvFormat
                            ? 'Failed to load CSV'
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
                        usesParquetFormat ||
                        usesCsvFormat ||
                        needsPublicationCheck
                          ? 20
                          : undefined
                      }
                    />
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="relative min-h-0 flex-1">
                <iframe
                  key={refreshKey}
                  ref={iframeRef}
                  src={displayUrl}
                  className={cn(
                    'size-full border-0',
                    needsPublicationCheck &&
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
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bottom-Left Utility Controls (Hover only) */}
            {(!!jsonData || (displayUrl && !validationError)) && (
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
                {showWasmTableView &&
                  jsonData !== null &&
                  !isLoadingJson &&
                  !jsonError && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground/70 hover:text-foreground bg-background/90 border-border/40 h-7 w-7 border backdrop-blur-sm"
                      onClick={handleCopyJson}
                      title={
                        usesParquetFormat ? 'Copy rows as JSON' : 'Copy JSON'
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
            {showWasmTableView &&
              jsonData !== null &&
              !isLoadingJson &&
              !jsonError && (
                <div className="pointer-events-auto absolute right-3 bottom-3 z-30 flex items-center">
                  <div className="border-border/40 bg-background/60 mr-2 flex items-center gap-0.5 rounded-md border p-0.5 shadow-sm backdrop-blur-md">
                    {(usesParquetFormat ||
                      (usesCsvFormat && !!jsonData) ||
                      needsPublicationCheck) && (
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
                    {usesJsonFormat && (
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
    </div>
  );
});
