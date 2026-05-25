import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import type { IModelCatalog, ModelsDevCatalog } from '@qwery/domain';

const DEFAULT_URL = 'https://models.dev/api.json';
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
/** Hard cap on the catalog response before it's persisted to the disk cache. */
const MAX_CATALOG_BYTES = 32 * 1024 * 1024;

/** A models.dev catalog is a JSON object map — reject anything else before caching. */
function isCatalogShape(value: unknown): value is ModelsDevCatalog {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function defaultCachePath(): string {
  return join(homedir(), '.qwery', 'cache', 'models-dev.json');
}

interface CacheEnvelope {
  fetchedAt: number;
  url: string;
  catalog: ModelsDevCatalog;
}

export interface HttpModelCatalogOptions {
  url?: string;
  /** Cache TTL in ms. Defaults to 7 days. */
  ttlMs?: number;
  /** Absolute path to the on-disk cache. Defaults to `~/.qwery/cache/models-dev.json`. */
  cachePath?: string;
}

class HttpModelCatalog implements IModelCatalog {
  private readonly url: string;
  private readonly ttlMs: number;
  private readonly cachePath: string;
  private memo: CacheEnvelope | null = null;
  private inflight: Promise<ModelsDevCatalog> | null = null;

  constructor(opts: HttpModelCatalogOptions = {}) {
    this.url = opts.url ?? DEFAULT_URL;
    this.ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
    this.cachePath = opts.cachePath ?? defaultCachePath();
  }

  private readDiskCache(): CacheEnvelope | null {
    if (!existsSync(this.cachePath)) return null;
    try {
      const raw = readFileSync(this.cachePath, 'utf-8');
      const parsed = JSON.parse(raw) as CacheEnvelope;
      if (
        parsed &&
        typeof parsed.fetchedAt === 'number' &&
        parsed.url === this.url &&
        parsed.catalog &&
        typeof parsed.catalog === 'object'
      ) {
        return parsed;
      }
    } catch {
      // corrupt or unreadable — fall through and re-fetch
    }
    return null;
  }

  private writeDiskCache(envelope: CacheEnvelope): void {
    try {
      mkdirSync(dirname(this.cachePath), { recursive: true });
      writeFileSync(this.cachePath, JSON.stringify(envelope), { mode: 0o600 });
    } catch {
      // cache is best-effort — never fail the call because of disk
    }
  }

  private isFresh(envelope: CacheEnvelope): boolean {
    return Date.now() - envelope.fetchedAt < this.ttlMs;
  }

  async getCatalog(): Promise<ModelsDevCatalog> {
    // 1. in-process memo — avoids disk I/O for repeated calls in the same run.
    if (this.memo && this.isFresh(this.memo)) return this.memo.catalog;

    // 2. disk cache — survives across CLI invocations.
    if (!this.memo) {
      const disk = this.readDiskCache();
      if (disk && this.isFresh(disk)) {
        this.memo = disk;
        return disk.catalog;
      }
    }

    // 3. re-fetch (deduplicate concurrent callers).
    if (this.inflight) return this.inflight;
    this.inflight = (async () => {
      try {
        const res = await fetch(this.url);
        if (!res.ok) {
          // Server returned an error — fall back to stale disk cache if present.
          const stale = this.readDiskCache();
          if (stale) {
            this.memo = stale;
            return stale.catalog;
          }
          throw new Error(`models.dev returned ${res.status} ${res.statusText}`);
        }
        // Sanitize the untrusted network payload before it flows to the disk cache:
        // bound its size and validate its shape.
        const declared = Number(res.headers.get('content-length'));
        if (Number.isFinite(declared) && declared > MAX_CATALOG_BYTES) {
          throw new Error(`models.dev response too large: ${declared} bytes`);
        }
        const parsed: unknown = await res.json();
        if (!isCatalogShape(parsed)) {
          throw new Error('models.dev returned an unexpected catalog shape');
        }
        const catalog = parsed;
        const envelope: CacheEnvelope = { fetchedAt: Date.now(), url: this.url, catalog };
        this.memo = envelope;
        this.writeDiskCache(envelope);
        return catalog;
      } catch (err) {
        // Offline — try stale cache as last resort.
        const stale = this.readDiskCache();
        if (stale) {
          this.memo = stale;
          return stale.catalog;
        }
        throw err;
      } finally {
        this.inflight = null;
      }
    })();
    return this.inflight;
  }
}

export function createHttpModelCatalog(opts?: HttpModelCatalogOptions): IModelCatalog {
  return new HttpModelCatalog(opts);
}
