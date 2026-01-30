/**
 * Unified utility functions for Datasource parsing and validation
 */

import {
  parseGoogleSheetsUrl,
  convertGoogleSheetsToEmbedUrl,
} from './google-sheets-preview';

export type DatasourceType = 'gsheet' | 'json' | 'parquet' | 'sql' | 'other';

/**
 * Identifies the type of datasource based on extension ID
 */
export function getDatasourceType(extensionId: string): DatasourceType {
  if (extensionId === 'gsheet-csv') return 'gsheet';
  if (extensionId === 'json-online') return 'json';
  if (extensionId === 'parquet-online') return 'parquet';
  if (
    extensionId.includes('postgresql') ||
    extensionId.includes('mysql') ||
    extensionId.includes('clickhouse') ||
    extensionId.includes('duckdb')
  ) {
    return 'sql';
  }
  return 'other';
}

/**
 * Validates a URL for a specific datasource type
 */
export function validateDatasourceUrl(
  extensionId: string,
  url: string | undefined | null,
): { isValid: boolean; error: string | null } {
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return { isValid: false, error: null }; // Neutral state if empty
  }

  const value = url.trim();
  const type = getDatasourceType(extensionId);

  if (type === 'gsheet') {
    const sheetsPattern = /^https:\/\/docs\.google\.com\/spreadsheets\/d\//;
    const idPattern = /^[a-zA-Z0-9-_]{20,}$/;
    if (!sheetsPattern.test(value) && !idPattern.test(value)) {
      return {
        isValid: false,
        error:
          'Enter a valid Google Sheets link (https://docs.google.com/spreadsheets/…).',
      };
    }
  }

  if (type === 'json' || type === 'parquet') {
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return {
          isValid: false,
          error:
            'Please enter a valid URL (must start with http:// or https://)',
        };
      }
    } catch {
      return {
        isValid: false,
        error: 'Please enter a valid URL (must start with http:// or https://)',
      };
    }
  }

  return { isValid: true, error: null };
}

/**
 * Gets the preview URL for a datasource based on its type and form values
 */
export function getDatasourcePreviewUrl(
  formValues: Record<string, unknown> | null,
  extensionId: string,
  formConfig?: {
    preset?: string;
    connectionFieldKind?: string;
    supportsPreview?: boolean;
  } | null,
): string | null {
  if (!formValues) return null;

  // Only process datasources that support preview
  if (formConfig?.supportsPreview !== true) {
    return null;
  }

  const type = getDatasourceType(extensionId);
  const preset = formConfig?.preset;
  const connectionFieldKind = formConfig?.connectionFieldKind;

  // Google Sheets - convert shared link to embed URL
  if (
    type === 'gsheet' ||
    preset === 'sharedLink' ||
    connectionFieldKind === 'sharedLink'
  ) {
    const sharedLink = (formValues.sharedLink || formValues.url) as
      | string
      | undefined;
    if (sharedLink && typeof sharedLink === 'string') {
      const embedUrl = convertGoogleSheetsToEmbedUrl(sharedLink);
      if (embedUrl) return embedUrl;

      // Fallback: try to extract sheet ID and use pubhtml directly
      const urlInfo = parseGoogleSheetsUrl(sharedLink);
      if (urlInfo) {
        if (urlInfo.isPublishedUrl) {
          return `https://docs.google.com/spreadsheets/d/e/${urlInfo.sheetId}/pubhtml?widget=true&headers=false&gid=${urlInfo.gid}`;
        }
        return `https://docs.google.com/spreadsheets/d/${urlInfo.sheetId}/pubhtml?widget=true&headers=false&gid=${urlInfo.gid}`;
      }
    }
  }

  // File URLs (JSON, Parquet, etc.)
  if (
    type === 'json' ||
    type === 'parquet' ||
    preset === 'fileUrl' ||
    connectionFieldKind === 'fileUrl'
  ) {
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

  // Connection URL (for SQL datasources that might have previewable URLs)
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
