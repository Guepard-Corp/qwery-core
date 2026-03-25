import { Hono } from 'hono';
import { z } from 'zod';
import { isValidCsv } from '@qwery/shared/csv-validate';
import {
  CreateDatasourceService,
  DeleteDatasourceService,
  GetDatasourceBySlugService,
  GetDatasourceService,
  UpdateDatasourceService,
} from '@qwery/domain/services';
import type { Repositories } from '@qwery/domain/repositories';
import {
  handleDomainException,
  isUUID,
  createNotFoundErrorResponse,
  createValidationErrorResponse,
} from '../lib/http-utils';
import { Code } from '@qwery/domain/common';
import { fetchWithSsrfProtection, SsrfBlockedError } from '../lib/ssrf-guard';
import { checkRateLimit } from '../lib/rate-limit';

const VALIDATE_URL_TIMEOUT_MS = 15_000;
const VALIDATE_URL_MAX_BYTES = 5 * 1024 * 1024;
const VALIDATE_URL_RATE_LIMIT_MAX = 30;
const VALIDATE_URL_RATE_LIMIT_WINDOW_MS = 60_000;

function getRateLimitKey(c: {
  req: { header: (name: string) => string | undefined };
}): string {
  const cf = c.req.header('cf-connecting-ip');
  if (cf?.trim()) return cf.trim();
  const real = c.req.header('x-real-ip');
  if (real?.trim()) return real.trim();
  const fwd = c.req.header('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]?.trim() || fwd.trim();
  return 'unknown';
}

async function readResponseBodyCapped(
  res: Response,
  maxBytes: number,
): Promise<
  | { ok: true; bytes: Uint8Array }
  | { ok: false; error: 'too_large'; partialBytes?: Uint8Array }
> {
  const reader = res.body?.getReader();
  if (!reader) {
    const buf = await res.arrayBuffer();
    if (buf.byteLength > maxBytes) return { ok: false, error: 'too_large' };
    return { ok: true, bytes: new Uint8Array(buf) };
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.length) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return { ok: false, error: 'too_large' };
      }
      chunks.push(value);
    }
  } catch {
    await reader.cancel().catch(() => {});
    throw new Error('Failed to read response body');
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return { ok: true, bytes: out };
}

const validateUrlBodySchema = z.object({
  url: z.string().min(1),
  expectedFormat: z.enum(['json', 'csv', 'parquet']),
});

const proxyJsonBodySchema = z.object({
  url: z.string().url().min(1),
});

export function createDatasourcesRoutes(
  getRepositories: () => Promise<Repositories>,
) {
  const app = new Hono();

  app.get('/', async (c) => {
    try {
      const repos = await getRepositories();
      const projectId = c.req.query('projectId');

      if (!projectId) {
        return c.json(
          {
            error: 'projectId query parameter is required',
            message:
              'Datasources must be fetched for a specific project. Please provide a projectId query parameter.',
          },
          400,
        );
      }

      const datasources = await repos.datasource.findByProjectId(projectId);
      return c.json(datasources ?? []);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.post('/proxy-json', async (c) => {
    try {
      const key = getRateLimitKey(c);
      if (
        !checkRateLimit(
          `datasources:proxy-json:${key}`,
          VALIDATE_URL_RATE_LIMIT_MAX,
          VALIDATE_URL_RATE_LIMIT_WINDOW_MS,
        )
      ) {
        return c.json({ error: 'Too many requests' }, 429);
      }

      const body = await c.req.json();
      const parsed = proxyJsonBodySchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ error: 'Invalid request: url is required' }, 400);
      }
      const { url } = parsed.data;
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        VALIDATE_URL_TIMEOUT_MS,
      );
      try {
        const res = await fetchWithSsrfProtection(url, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        clearTimeout(timeout);
        if (!res.ok) {
          return c.json(
            {
              error: `URL returned ${res.status}. Ensure the link is publicly accessible.`,
            },
            400,
          );
        }
        const bodyRead = await readResponseBodyCapped(
          res,
          VALIDATE_URL_MAX_BYTES,
        );
        if (!bodyRead.ok) {
          return c.json({ error: 'JSON file too large (max 5MB)' }, 400);
        }
        const text = new TextDecoder().decode(bodyRead.bytes);
        try {
          const data = JSON.parse(text);
          return c.json({ data });
        } catch {
          return c.json({ error: 'URL does not return valid JSON' }, 400);
        }
      } catch (err) {
        clearTimeout(timeout);
        if (err instanceof SsrfBlockedError) {
          return c.json({ error: err.message }, 400);
        }
        if (err instanceof Error && err.name === 'AbortError') {
          return c.json({ error: 'Request timed out' }, 408);
        }
        return c.json(
          {
            error: err instanceof Error ? err.message : 'Failed to fetch URL',
          },
          502,
        );
      }
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.post('/validate-url', async (c) => {
    try {
      const key = getRateLimitKey(c);
      if (
        !checkRateLimit(
          `datasources:validate-url:${key}`,
          VALIDATE_URL_RATE_LIMIT_MAX,
          VALIDATE_URL_RATE_LIMIT_WINDOW_MS,
        )
      ) {
        return c.json({ valid: false, error: 'Too many requests' }, 429);
      }

      const body = await c.req.json();
      const parsed = validateUrlBodySchema.safeParse(body);
      if (!parsed.success) {
        return c.json(
          {
            valid: false,
            error: 'Invalid request: url and expectedFormat required',
          },
          400,
        );
      }
      const { url, expectedFormat } = parsed.data;
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        VALIDATE_URL_TIMEOUT_MS,
      );
      try {
        const res = await fetchWithSsrfProtection(url, {
          // TextDecoder requires a valid encoding; default is utf-8.
          // We only read a small prefix for JSON/CSV; Parquet is inspected via magic bytes.
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) {
          return c.json({
            valid: false,
            error: `URL returned ${res.status}. Ensure the link is publicly accessible.`,
          });
        }
        const bodyRead = await readResponseBodyCapped(
          res,
          VALIDATE_URL_MAX_BYTES,
        );
        if (!bodyRead.ok) {
          return c.json({
            valid: false,
            error: 'File is too large to validate',
          });
        }
        const bytes = bodyRead.bytes;

        if (expectedFormat === 'json') {
          const text = new TextDecoder().decode(bytes);
          try {
            JSON.parse(text);
            return c.json({ valid: true });
          } catch {
            return c.json({
              valid: false,
              error:
                'URL does not return valid JSON. Use a JSON datasource for JSON files.',
            });
          }
        }

        if (expectedFormat === 'csv') {
          const text = new TextDecoder().decode(bytes);
          const trimmed = text.trim();
          if (!trimmed) {
            return c.json({
              valid: false,
              error:
                'URL returned empty content. Use a CSV datasource for CSV files.',
            });
          }
          if (!isValidCsv(trimmed)) {
            return c.json({
              valid: false,
              error:
                'URL does not appear to be valid CSV. Use a CSV datasource for CSV files.',
            });
          }
          return c.json({ valid: true });
        }

        if (expectedFormat === 'parquet') {
          if (bytes.byteLength < 4) {
            return c.json({
              valid: false,
              error: 'URL does not appear to be a Parquet file (too small).',
            });
          }
          const magic = String.fromCharCode(
            bytes[0] ?? 0,
            bytes[1] ?? 0,
            bytes[2] ?? 0,
            bytes[3] ?? 0,
          );
          if (magic !== 'PAR1') {
            return c.json({
              valid: false,
              error:
                'URL does not appear to be a Parquet file (missing PAR1 magic bytes).',
            });
          }
          return c.json({ valid: true });
        }

        return c.json({ valid: false, error: 'Unsupported format' });
      } catch (err) {
        clearTimeout(timeout);
        if (err instanceof SsrfBlockedError) {
          return c.json({
            valid: false,
            error: err.message,
          });
        }
        if (err instanceof Error && err.name === 'AbortError') {
          return c.json({
            valid: false,
            error: 'Request timed out. Ensure the URL is accessible.',
          });
        }
        return c.json({
          valid: false,
          error: err instanceof Error ? err.message : 'Failed to fetch URL',
        });
      }
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.get('/:id', async (c) => {
    try {
      const id = c.req.param('id');
      if (!id)
        return createNotFoundErrorResponse(
          'Not found',
          Code.DATASOURCE_NOT_FOUND_ERROR,
        );

      const repos = await getRepositories();
      const useCase = isUUID(id)
        ? new GetDatasourceService(repos.datasource)
        : new GetDatasourceBySlugService(repos.datasource);
      const datasource = await useCase.execute(id);
      return c.json(datasource);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.post('/', async (c) => {
    try {
      const repos = await getRepositories();
      const body = await c.req.json();
      const useCase = new CreateDatasourceService(repos.datasource);
      const datasource = await useCase.execute(body);
      return c.json(datasource, 201);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.put('/:id', async (c) => {
    try {
      const id = c.req.param('id');
      if (!id)
        return createValidationErrorResponse(
          'Method not allowed',
          Code.BAD_REQUEST_ERROR,
        );

      const repos = await getRepositories();
      const body = await c.req.json();
      const useCase = new UpdateDatasourceService(repos.datasource);
      const datasource = await useCase.execute({ ...body, id });
      return c.json(datasource);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.delete('/:id', async (c) => {
    try {
      const id = c.req.param('id');
      if (!id)
        return createValidationErrorResponse(
          'Method not allowed',
          Code.BAD_REQUEST_ERROR,
        );

      const repos = await getRepositories();
      const useCase = new DeleteDatasourceService(repos.datasource);
      await useCase.execute(id);
      return c.json({ success: true });
    } catch (error) {
      return handleDomainException(error);
    }
  });

  return app;
}
