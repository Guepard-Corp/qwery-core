/**
 * Validates that every error code in the shared registry has a corresponding
 * i18n key that exists in apps/web common.json (errors section).
 * Run: pnpm validate:error-keys (from root) or pnpm test -- validate-error-i18n (from shared).
 */
import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import {
  ERROR_CODES,
  ERROR_REGISTRY_OVERRIDES,
  getI18nKeyForErrorCode,
} from '../src/error';

const COMMON_JSON_PATH = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'apps',
  'web',
  'lib',
  'i18n',
  'locales',
  'en',
  'common.json',
);

function getNested(obj: Record<string, unknown>, pathStr: string): unknown {
  const parts = pathStr.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined || typeof cur !== 'object') {
      return undefined;
    }
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

describe('Error i18n keys', () => {
  it('every error code has an i18n key present in apps/web common.json', () => {
    if (!fs.existsSync(COMMON_JSON_PATH)) {
      throw new Error(`Missing common.json at ${COMMON_JSON_PATH}`);
    }

    const common = JSON.parse(
      fs.readFileSync(COMMON_JSON_PATH, 'utf-8'),
    ) as Record<string, unknown>;
    const errorsSection = common.errors as Record<string, unknown> | undefined;
    if (!errorsSection || typeof errorsSection !== 'object') {
      throw new Error('common.json has no "errors" object');
    }

    const codes = Object.values(ERROR_CODES) as number[];
    const missing: { code: number; i18nKey?: string; reason: string }[] = [];

    for (const code of codes) {
      const i18nKey = getI18nKeyForErrorCode(code, {
        overrides: ERROR_REGISTRY_OVERRIDES,
      });
      if (!i18nKey) {
        missing.push({ code, reason: 'No i18n key for code' });
        continue;
      }
      const prefix = 'common:errors.';
      if (!i18nKey.startsWith(prefix)) {
        missing.push({
          code,
          i18nKey,
          reason: 'Key does not start with common:errors.',
        });
        continue;
      }
      const pathInErrors = i18nKey.slice(prefix.length);
      const value = getNested(errorsSection, pathInErrors);
      if (value === undefined) {
        missing.push({
          code,
          i18nKey,
          reason: 'Key missing in common.json errors',
        });
      }
    }

    const message =
      missing.length > 0
        ? `Missing or invalid i18n for codes:\n${missing
            .map(
              (m) =>
                `  Code ${m.code}: ${m.reason}${m.i18nKey ? ` (${m.i18nKey})` : ''}`,
            )
            .join(
              '\n',
            )}\n\nAdd keys to apps/web/lib/i18n/locales/en/common.json`
        : '';
    expect(missing, message).toHaveLength(0);
  });
});
