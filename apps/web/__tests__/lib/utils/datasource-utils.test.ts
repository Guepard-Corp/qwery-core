import { describe, expect, it } from 'vitest';

import {
  getDatasourcePreviewUrl,
  getUrlForValidation,
  inferPreviewMode,
  isGsheetLikeUrl,
  requiresDataFetching,
  requiresPublicationCheck,
  usesCsvDataFormat,
  usesJsonDataFormat,
  usesParquetDataFormat,
  validateDatasourceUrl,
} from '~/lib/utils/datasource-utils';
import {
  expandStoredConfigForFormDefaults,
  getConnectionValueKey,
} from '~/lib/utils/datasource-connection-fields-utils';

describe('isGsheetLikeUrl', () => {
  it('returns true for valid Google Sheets URLs', () => {
    expect(
      isGsheetLikeUrl(
        'https://docs.google.com/spreadsheets/d/1ABC123/edit#gid=0',
      ),
    ).toBe(true);
    expect(
      isGsheetLikeUrl(
        'https://docs.google.com/spreadsheets/d/e/1PUB456/pubhtml',
      ),
    ).toBe(true);
  });

  it('returns true for bare sheet ID (20+ alphanumeric)', () => {
    expect(
      isGsheetLikeUrl('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'),
    ).toBe(true);
  });

  it('returns false for non-Google hosts', () => {
    expect(
      isGsheetLikeUrl('https://evil.com/docs.google.com/spreadsheets/d/123'),
    ).toBe(false);
    expect(
      isGsheetLikeUrl('https://docs.google.com.evil.com/spreadsheets/d/123'),
    ).toBe(false);
  });

  it('returns false for null, undefined, empty', () => {
    expect(isGsheetLikeUrl(null)).toBe(false);
    expect(isGsheetLikeUrl(undefined)).toBe(false);
    expect(isGsheetLikeUrl('')).toBe(false);
  });

  it('returns false for path without /spreadsheets/d/', () => {
    expect(isGsheetLikeUrl('https://docs.google.com/document/d/123')).toBe(
      false,
    );
  });
});

describe('inferPreviewMode', () => {
  it('returns data-fetch for JSON URLs', () => {
    const r = inferPreviewMode('https://example.com/data.json');
    expect(r).toEqual({
      mode: 'data-fetch',
      isEmbeddable: false,
      requiresPublicationCheck: false,
      dataFormat: 'json',
    });
  });

  it('returns data-fetch for CSV and Parquet URLs', () => {
    expect(inferPreviewMode('https://example.com/file.csv')).toMatchObject({
      mode: 'data-fetch',
      dataFormat: 'csv',
    });
    expect(inferPreviewMode('https://example.com/file.parquet')).toMatchObject({
      mode: 'data-fetch',
      dataFormat: 'parquet',
    });
  });

  it('returns iframe + requiresPublicationCheck for docs.google.com spreadsheets', () => {
    const r = inferPreviewMode(
      'https://docs.google.com/spreadsheets/d/1abc/edit#gid=0',
    );
    expect(r).toEqual({
      mode: 'iframe',
      isEmbeddable: true,
      requiresPublicationCheck: true,
      dataFormat: undefined,
    });
  });

  it('returns iframe without publication check for non-Google embed URLs', () => {
    const r = inferPreviewMode('https://other.com/page?embed=true');
    expect(r).toMatchObject({
      mode: 'iframe',
      isEmbeddable: true,
      requiresPublicationCheck: false,
    });
  });

  it('returns iframe + requiresPublicationCheck for bare ID (parse failure path)', () => {
    const r = inferPreviewMode('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
    expect(r).toEqual({
      mode: 'iframe',
      isEmbeddable: true,
      requiresPublicationCheck: true,
      dataFormat: undefined,
    });
  });

  it('returns null for null, undefined, empty', () => {
    expect(inferPreviewMode(null)).toBeNull();
    expect(inferPreviewMode(undefined)).toBeNull();
    expect(inferPreviewMode('')).toBeNull();
  });
});

describe('requiresPublicationCheck', () => {
  it('returns true only for Google Sheets-like URLs', () => {
    expect(
      requiresPublicationCheck(
        'https://docs.google.com/spreadsheets/d/1abc/edit',
      ),
    ).toBe(true);
    expect(requiresPublicationCheck('https://example.com/file.json')).toBe(
      false,
    );
  });
});

describe('requiresDataFetching', () => {
  it('returns true for data-file URLs', () => {
    expect(requiresDataFetching('https://example.com/data.json')).toBe(true);
    expect(requiresDataFetching('https://example.com/data.csv')).toBe(true);
  });

  it('returns false for embeddable URLs', () => {
    expect(
      requiresDataFetching('https://docs.google.com/spreadsheets/d/1abc/edit'),
    ).toBe(false);
  });
});

describe('usesJsonDataFormat', () => {
  it('returns true for .json URLs', () => {
    expect(usesJsonDataFormat('https://example.com/d.json')).toBe(true);
  });
  it('returns false for non-JSON', () => {
    expect(usesJsonDataFormat('https://example.com/d.csv')).toBe(false);
  });
});

describe('usesParquetDataFormat', () => {
  it('returns true for .parquet URLs', () => {
    expect(usesParquetDataFormat('https://example.com/d.parquet')).toBe(true);
  });
});

describe('usesCsvDataFormat', () => {
  it('returns true for .csv URLs', () => {
    expect(usesCsvDataFormat('https://example.com/d.csv')).toBe(true);
  });
});

describe('validateDatasourceUrl', () => {
  it('returns valid for empty url (no error message)', () => {
    expect(
      validateDatasourceUrl(
        {
          id: 'gsheet-csv',
          supportsPreview: true,
          previewUrlKind: 'embeddable',
        },
        '',
      ),
    ).toEqual({ isValid: false, error: null });
  });

  it('validates embeddable (Google Sheets) URLs', () => {
    const meta = {
      id: 'gsheet-csv',
      supportsPreview: true,
      previewUrlKind: 'embeddable' as const,
    };
    expect(
      validateDatasourceUrl(
        meta,
        'https://docs.google.com/spreadsheets/d/1ABC/edit',
      ),
    ).toEqual({ isValid: true, error: null });
  });

  it('validates data-file URLs must be http(s)', () => {
    const meta = {
      id: 'csv-online',
      supportsPreview: true,
      previewUrlKind: 'data-file' as const,
    };
    expect(validateDatasourceUrl(meta, 'https://example.com/file.csv')).toEqual(
      { isValid: true, error: null },
    );
    expect(validateDatasourceUrl(meta, 'ftp://example.com/file.csv')).toEqual({
      isValid: false,
      error: 'Please enter a valid URL (must start with http:// or https://)',
    });
  });

  it('returns valid when meta is null or no preview kind', () => {
    expect(validateDatasourceUrl(null, 'https://example.com/any')).toEqual({
      isValid: true,
      error: null,
    });
  });

  it('rejects mismatched file extension for data-file kinds when previewDataFormat is set', () => {
    const jsonMeta = {
      id: 'json-online',
      supportsPreview: true,
      previewUrlKind: 'data-file' as const,
      previewDataFormat: 'json' as const,
    };
    const csvMeta = {
      id: 'csv-online',
      supportsPreview: true,
      previewUrlKind: 'data-file' as const,
      previewDataFormat: 'csv' as const,
    };
    const parquetMeta = {
      id: 'parquet-online',
      supportsPreview: true,
      previewUrlKind: 'data-file' as const,
      previewDataFormat: 'parquet' as const,
    };

    expect(
      validateDatasourceUrl(jsonMeta, 'https://example.com/file.csv'),
    ).toEqual({
      isValid: false,
      error: 'This datasource expects a .json file URL.',
    });
    expect(
      validateDatasourceUrl(csvMeta, 'https://example.com/file.json'),
    ).toEqual({
      isValid: false,
      error: 'This datasource expects a .csv file URL.',
    });
    expect(
      validateDatasourceUrl(parquetMeta, 'https://example.com/file.csv'),
    ).toEqual({
      isValid: false,
      error: 'This datasource expects a .parquet file URL.',
    });
  });
});

describe('getUrlForValidation', () => {
  it('returns undefined when no formValues or supportsPreview false', () => {
    expect(getUrlForValidation(null, { id: 'x', supportsPreview: true })).toBe(
      undefined,
    );
    expect(
      getUrlForValidation({ sharedLink: 'https://x.com' }, { id: 'x' }),
    ).toBe(undefined);
  });

  it('returns sharedLink or url for embeddable kind', () => {
    const meta = {
      id: 'gsheet-csv',
      supportsPreview: true,
      previewUrlKind: 'embeddable' as const,
    };
    expect(getUrlForValidation({ sharedLink: 'https://sheet' }, meta)).toBe(
      'https://sheet',
    );
    expect(getUrlForValidation({ url: 'https://sheet' }, meta)).toBe(
      'https://sheet',
    );
  });

  it('returns url / jsonUrl / connectionUrl for data-file kind', () => {
    const meta = {
      id: 'csv-online',
      supportsPreview: true,
      previewUrlKind: 'data-file' as const,
    };
    expect(getUrlForValidation({ url: 'https://f.csv' }, meta)).toBe(
      'https://f.csv',
    );
    expect(getUrlForValidation({ jsonUrl: 'https://f.json' }, meta)).toBe(
      'https://f.json',
    );
  });
});

describe('getDatasourcePreviewUrl', () => {
  it('returns null when no formValues or supportsPreview false', () => {
    expect(getDatasourcePreviewUrl({ sharedLink: 'x' }, { id: 'x' })).toBe(
      null,
    );
    expect(
      getDatasourcePreviewUrl(null, { id: 'x', supportsPreview: true }),
    ).toBe(null);
  });

  it('returns raw URL for embeddable + Google Sheets link', () => {
    const meta = {
      id: 'gsheet-csv',
      supportsPreview: true,
      previewUrlKind: 'embeddable' as const,
    };
    const url = getDatasourcePreviewUrl(
      {
        sharedLink:
          'https://docs.google.com/spreadsheets/d/1abc12345678901234567890/edit#gid=0',
      },
      meta,
    );
    expect(url).toContain('docs.google.com');
    expect(url).toContain('/spreadsheets/d/');
    expect(url).toContain('/edit');
  });

  it('returns raw URL for data-file kind', () => {
    const meta = {
      id: 'csv-online',
      supportsPreview: true,
      previewUrlKind: 'data-file' as const,
    };
    expect(
      getDatasourcePreviewUrl({ url: 'https://example.com/file.csv' }, meta),
    ).toBe('https://example.com/file.csv');
  });
});

describe('getConnectionValueKey', () => {
  it('uses jsonUrl for json-online (matches saved normalizeProviderConfig)', () => {
    expect(getConnectionValueKey('fileUrl', undefined, 'json-online')).toBe(
      'jsonUrl',
    );
  });

  it('defaults to url for csv/parquet fileUrl', () => {
    expect(getConnectionValueKey('fileUrl', undefined, 'csv-online')).toBe(
      'url',
    );
    expect(getConnectionValueKey('fileUrl', undefined, 'parquet-online')).toBe(
      'url',
    );
  });

  it('uses database for embeddable DuckDB / PGlite (matches saved normalize)', () => {
    expect(getConnectionValueKey('connectionString', undefined, 'duckdb')).toBe(
      'database',
    );
    expect(
      getConnectionValueKey('connectionString', undefined, 'duckdb-wasm'),
    ).toBe('database');
    expect(getConnectionValueKey('connectionString', undefined, 'pglite')).toBe(
      'database',
    );
  });
});

describe('expandStoredConfigForFormDefaults', () => {
  it('maps connectionString into connectionUrl for SQL datasources', () => {
    const out = expandStoredConfigForFormDefaults('postgresql', {
      connectionString: 'postgresql://u:p@h:5432/db',
    });
    expect(out.connectionUrl).toBe('postgresql://u:p@h:5432/db');
  });

  it('maps jsonUrl for json-online and fills url aliases', () => {
    expect(
      expandStoredConfigForFormDefaults('json-online', {
        jsonUrl: 'https://example.com/a.json',
      }).jsonUrl,
    ).toBe('https://example.com/a.json');
    expect(
      expandStoredConfigForFormDefaults('json-online', {
        url: 'https://example.com/a.json',
      }).jsonUrl,
    ).toBe('https://example.com/a.json');
  });

  it('maps database path for DuckDB when only legacy keys exist', () => {
    const out = expandStoredConfigForFormDefaults('duckdb', {
      connectionUrl: ':memory:',
    });
    expect(out.database).toBe(':memory:');
  });

  it('fills sharedLink for gsheet-csv from url/connectionUrl', () => {
    expect(
      expandStoredConfigForFormDefaults('gsheet-csv', {
        url: 'https://docs.google.com/spreadsheets/d/abc/edit#gid=0',
      }).sharedLink,
    ).toBe('https://docs.google.com/spreadsheets/d/abc/edit#gid=0');
  });

  it('cleans invalid gsheet sharedLink and recovers from url', () => {
    expect(
      expandStoredConfigForFormDefaults('gsheet-csv', {
        sharedLink: 'postgresql://u:p@h:5432/db',
        url: 'https://docs.google.com/spreadsheets/d/abc/edit#gid=0',
      }).sharedLink,
    ).toBe('https://docs.google.com/spreadsheets/d/abc/edit#gid=0');
  });

  it('fills url/jsonUrl for non-legacy schema forms', () => {
    const out = expandStoredConfigForFormDefaults('some-new-extension', {
      jsonUrl: 'https://x.com/f.json',
    });
    expect(out.url).toBe('https://x.com/f.json');
    expect(out.jsonUrl).toBe('https://x.com/f.json');
  });
});
