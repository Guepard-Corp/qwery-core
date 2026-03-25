import { describe, expect, it, vi, beforeEach } from 'vitest';
import { z } from 'zod';

import type { DatasourceExtensionMeta } from '~/lib/utils/datasource-utils';
import { validateDatasourceConfigPipeline } from '~/lib/utils/datasource-config-pipeline';
import { DATASOURCE_INPUT_MAX_LENGTH } from '@qwery/extensions-sdk';

vi.mock('~/lib/utils/validate-datasource-url-structure', () => ({
  validateUrlStructure: vi.fn().mockResolvedValue({ valid: true, error: null }),
}));

import { validateUrlStructure } from '~/lib/utils/validate-datasource-url-structure';
import { EXTENSION_META_FOR_VALIDATION } from '~/lib/utils/datasource-form-config';
import extensionsRegistry from '../../../public/extensions/registry.json';

const jsonOnlinePreviewMeta: DatasourceExtensionMeta = {
  id: 'json-online',
  supportsPreview: true,
  previewUrlKind: 'data-file',
  previewDataFormat: 'json',
};

describe('validateDatasourceConfigPipeline', () => {
  beforeEach(() => {
    vi.mocked(validateUrlStructure).mockResolvedValue({
      valid: true,
      error: null,
    });
  });

  it('rejects legacy json-online URL exceeding max length', async () => {
    const longUrl = `https://example.com/${'a'.repeat(DATASOURCE_INPUT_MAX_LENGTH.url)}`;
    const result = await validateDatasourceConfigPipeline({
      values: { url: longUrl },
      extensionId: 'json-online',
      extensionMeta: jsonOnlinePreviewMeta,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/at most|too|characters|max/i);
    }
  });

  it('accepts legacy json-online with valid URL and runs structure check when preview meta matches', async () => {
    const result = await validateDatasourceConfigPipeline({
      values: { url: 'https://example.com/data.json' },
      extensionId: 'json-online',
      extensionMeta: jsonOnlinePreviewMeta,
    });
    expect(result.success).toBe(true);
    expect(validateUrlStructure).toHaveBeenCalledWith(
      'https://example.com/data.json',
      'json',
    );
  });

  it('normalized json-online config (jsonUrl) parses with driver schema', async () => {
    const result = await validateDatasourceConfigPipeline({
      values: { jsonUrl: 'https://example.com/data.json' },
      extensionId: 'json-online',
      extensionMeta: jsonOnlinePreviewMeta,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.config.url).toBe('https://example.com/data.json');
  });

  it('rejects legacy gsheet-csv shared link exceeding max length', async () => {
    const longLink = `https://docs.google.com/${'a'.repeat(DATASOURCE_INPUT_MAX_LENGTH.sharedLink)}`;
    const result = await validateDatasourceConfigPipeline({
      values: { sharedLink: longLink },
      extensionId: 'gsheet-csv',
      extensionMeta: {
        id: 'gsheet-csv',
        supportsPreview: true,
        previewUrlKind: 'embeddable',
      },
    });
    expect(result.success).toBe(false);
  });

  it('returns failure when non-legacy extension has no schema', async () => {
    const result = await validateDatasourceConfigPipeline({
      values: { foo: 'bar' },
      extensionId: 'unknown-extension-not-in-legacy-rules',
      schema: undefined,
      extensionMeta: null,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('No schema available');
  });

  it('schema path: rejects values failing zod (e.g. URL too long)', async () => {
    const schema = z.object({
      connectionUrl: z.string().max(100).url(),
    });
    const result = await validateDatasourceConfigPipeline({
      values: {
        connectionUrl: `https://example.com/${'x'.repeat(200)}`,
      },
      extensionId: 'non-legacy-fake',
      schema,
      extensionMeta: null,
    });
    expect(result.success).toBe(false);
  });

  it('fails when remote URL structure validation rejects the URL', async () => {
    vi.mocked(validateUrlStructure).mockResolvedValueOnce({
      valid: false,
      error: 'URL does not return valid JSON',
    });
    const result = await validateDatasourceConfigPipeline({
      values: { url: 'https://example.com/wrong.txt' },
      extensionId: 'json-online',
      extensionMeta: jsonOnlinePreviewMeta,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('URL does not return valid JSON');
    }
  });

  it('EXTENSION_META_FOR_VALIDATION matches registry', () => {
    const registry = (extensionsRegistry as { datasources?: unknown[] })
      .datasources;
    expect(Array.isArray(registry)).toBe(true);
    if (!Array.isArray(registry)) return;

    const byId = new Map<string, Record<string, unknown>>();
    for (const ds of registry) {
      if (ds && typeof ds === 'object' && 'id' in ds) {
        byId.set(
          String((ds as { id: unknown }).id),
          ds as Record<string, unknown>,
        );
      }
    }

    for (const [id, meta] of Object.entries(EXTENSION_META_FOR_VALIDATION)) {
      const reg = byId.get(id);
      expect(reg).toBeTruthy();
      if (!reg) continue;

      expect(reg.supportsPreview).toBe(meta.supportsPreview);
      expect(reg.previewUrlKind).toBe(meta.previewUrlKind);
      if ('previewDataFormat' in meta && meta.previewDataFormat) {
        expect(reg.previewDataFormat).toBe(meta.previewDataFormat);
      }
    }
  });
});
