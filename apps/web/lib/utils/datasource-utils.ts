/**
 * Unified utility functions for Datasource parsing and validation.
 * Uses extension metadata from @qwery/extensions-sdk (supportsPreview, previewUrlKind, etc.).
 */

import { z } from 'zod';
import type { ExtensionDefinition } from '@qwery/extensions-sdk';
import {
  parseGoogleSheetsUrl,
  convertGoogleSheetsToEmbedUrl,
} from './google-sheets-preview';

/** Minimal extension meta for validation and preview (from ExtensionDefinition). */
export type DatasourceExtensionMeta = Pick<
  ExtensionDefinition,
  'id' | 'supportsPreview' | 'previewUrlKind' | 'previewDataFormat'
>;

export function isGsheetLikeUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const t = url.trim();
  return (
    t.includes('docs.google.com/spreadsheets') || /^[a-zA-Z0-9-_]{20,}$/.test(t)
  );
}

/**
 * Generic preview mode detection based on URL characteristics
 */
export type PreviewMode = 'iframe' | 'data-fetch' | 'structured-data';

export interface PreviewUrlInfo {
  mode: PreviewMode;
  isEmbeddable: boolean;
  requiresPublicationCheck: boolean;
  dataFormat?: 'json' | 'parquet' | 'csv' | 'table';
}

/**
 * Infers preview behavior from URL characteristics without hardcoding specific services
 */
export function inferPreviewMode(
  url: string | null | undefined,
): PreviewUrlInfo | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);

    // Check if URL is a data file (has file extension indicating structured data)
    const pathname = parsed.pathname.toLowerCase();
    const hasDataFileExtension =
      pathname.endsWith('.json') ||
      pathname.endsWith('.parquet') ||
      pathname.endsWith('.csv') ||
      pathname.includes('.json?') ||
      pathname.includes('.parquet?') ||
      pathname.includes('.csv?');

    if (hasDataFileExtension) {
      let dataFormat: 'json' | 'parquet' | 'csv' | 'table' = 'table';
      if (pathname.endsWith('.json') || pathname.includes('.json?')) {
        dataFormat = 'json';
      } else if (
        pathname.endsWith('.parquet') ||
        pathname.includes('.parquet?')
      ) {
        dataFormat = 'parquet';
      } else if (pathname.endsWith('.csv') || pathname.includes('.csv?')) {
        dataFormat = 'csv';
      }

      return {
        mode: 'data-fetch',
        isEmbeddable: false,
        requiresPublicationCheck: false,
        dataFormat,
      };
    }

    const hostname = parsed.hostname.toLowerCase();
    const isEmbeddableService =
      hostname.includes('docs.google.com') ||
      hostname.includes('spreadsheets') ||
      parsed.searchParams.has('embed') ||
      parsed.searchParams.has('widget');

    if (isEmbeddableService) {
      return {
        mode: 'iframe',
        isEmbeddable: true,
        requiresPublicationCheck:
          hostname.includes('docs.google.com') &&
          hostname.includes('spreadsheets'),
        dataFormat: undefined,
      };
    }

    return {
      mode: 'iframe',
      isEmbeddable: true,
      requiresPublicationCheck: false,
      dataFormat: undefined,
    };
  } catch {
    // If URL parsing fails, check if it's a simple ID pattern (like Google Sheets ID)
    const trimmed = url.trim();
    if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
      return {
        mode: 'iframe',
        isEmbeddable: true,
        requiresPublicationCheck: true,
        dataFormat: undefined,
      };
    }
    return null;
  }
}

/**
 * Infers if a URL requires publication status checking
 */
export function requiresPublicationCheck(
  url: string | null | undefined,
): boolean {
  const info = inferPreviewMode(url);
  return info?.requiresPublicationCheck ?? false;
}

/**
 * Infers if a URL requires data fetching for preview
 */
export function requiresDataFetching(url: string | null | undefined): boolean {
  const info = inferPreviewMode(url);
  return info?.mode === 'data-fetch';
}

/**
 * Infers if a URL uses JSON data format for preview
 */
export function usesJsonDataFormat(url: string | null | undefined): boolean {
  const info = inferPreviewMode(url);
  return info?.dataFormat === 'json';
}

/**
 * Infers if a URL uses Parquet data format for preview
 */
export function usesParquetDataFormat(url: string | null | undefined): boolean {
  const info = inferPreviewMode(url);
  return info?.dataFormat === 'parquet';
}

/**
 * Infers if a URL uses CSV data format for preview
 */
export function usesCsvDataFormat(url: string | null | undefined): boolean {
  const info = inferPreviewMode(url);
  return info?.dataFormat === 'csv';
}

/**
 * Zod schema for HTTP/HTTPS URL validation
 */
const HttpUrlSchema = z.string().refine(
  (url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  },
  {
    message: 'URL must start with http:// or https://',
  },
);

/**
 * Zod schema for Google Sheets URL validation (used only for validation, not inference)
 */
const GoogleSheetsUrlSchema = z.string().refine(
  (url) => {
    const trimmed = url.trim();
    return (
      trimmed.includes('docs.google.com/spreadsheets') ||
      /^[a-zA-Z0-9-_]{20,}$/.test(trimmed)
    );
  },
  {
    message: 'Invalid Google Sheets URL',
  },
);

/**
 * Validates a URL using extension metadata (previewUrlKind from extension definition).
 */
export function validateDatasourceUrl(
  extensionMeta: DatasourceExtensionMeta | undefined | null,
  url: string | undefined | null,
): { isValid: boolean; error: string | null } {
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return { isValid: false, error: null };
  }

  const value = url.trim();
  const kind = extensionMeta?.previewUrlKind;

  if (kind === 'embeddable' && isGsheetLikeUrl(value)) {
    const result = GoogleSheetsUrlSchema.safeParse(value);
    if (!result.success) {
      return {
        isValid: false,
        error:
          'Enter a valid Google Sheets link (https://docs.google.com/spreadsheets/…).',
      };
    }
  }

  if (kind === 'data-file') {
    const result = HttpUrlSchema.safeParse(value);
    if (!result.success) {
      return {
        isValid: false,
        error: 'Please enter a valid URL (must start with http:// or https://)',
      };
    }
  }

  return { isValid: true, error: null };
}

/**
 * Gets the preview URL using extension metadata (supportsPreview, previewUrlKind from extension definition).
 */
export function getDatasourcePreviewUrl(
  formValues: Record<string, unknown> | null,
  extensionMeta: DatasourceExtensionMeta | undefined | null,
): string | null {
  if (!formValues) return null;
  if (extensionMeta?.supportsPreview !== true) return null;

  const kind = extensionMeta.previewUrlKind;
  const sharedLink = (formValues.sharedLink || formValues.url) as
    | string
    | undefined;

  if (kind === 'embeddable' && sharedLink && isGsheetLikeUrl(sharedLink)) {
    const embedUrl = convertGoogleSheetsToEmbedUrl(sharedLink);
    if (embedUrl) return embedUrl;

    const urlInfo = parseGoogleSheetsUrl(sharedLink);
    if (urlInfo) {
      if (urlInfo.isPublishedUrl) {
        return `https://docs.google.com/spreadsheets/d/e/${urlInfo.sheetId}/pubhtml?widget=true&headers=false&gid=${urlInfo.gid}`;
      }
      return `https://docs.google.com/spreadsheets/d/${urlInfo.sheetId}/pubhtml?widget=true&headers=false&gid=${urlInfo.gid}`;
    }
  }

  if (kind === 'data-file') {
    const url = (formValues.url ||
      formValues.jsonUrl ||
      formValues.connectionUrl) as string | undefined;
    if (
      url &&
      typeof url === 'string' &&
      (url.startsWith('http://') || url.startsWith('https://'))
    ) {
      return url;
    }
  }

  const connectionUrl = (formValues.connectionUrl || formValues.url) as
    | string
    | undefined;
  if (
    connectionUrl &&
    typeof connectionUrl === 'string' &&
    (connectionUrl.startsWith('http://') ||
      connectionUrl.startsWith('https://'))
  ) {
    return connectionUrl;
  }

  return null;
}
