import { performance } from 'node:perf_hooks';

import { google, youtube_v3 } from 'googleapis';
import { z } from 'zod/v3';

import type {
  DatasourceMetadata,
  DriverContext,
  IDataSourceDriver,
  DatasourceResultSet,
} from '@qwery/extensions-sdk';
import {
  DatasourceMetadataZodSchema,
  getQueryEngineConnection,
  type QueryEngineConnection,
} from '@qwery/extensions-sdk';

const ConfigSchema = z.object({
  apiKey: z.string().min(1, 'apiKey is required'),
  channelId: z.string().min(1, 'channelId is required'),
  maxResults: z.number().int().positive().max(50).default(25),
  publishedAfter: z.string().datetime().optional(),
  publishedBefore: z.string().datetime().optional(),
});

type DriverConfig = z.infer<typeof ConfigSchema>;

type VideoRow = {
  videoId: string;
  title: string;
  description: string | null;
  publishedAt: string | null;
  channelId: string | null;
  channelTitle: string | null;
  categoryId: string | null;
  durationSeconds: number | null;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  favoriteCount: number | null;
  definition: string | null;
  dimension: string | null;
  liveBroadcastContent: string | null;
  tags: string[];
};

type InstanceEntry = {
  instance: Awaited<ReturnType<typeof createDuckDbInstance>>;
  signature: string | null;
};

const VIEW_NAME = 'videos';
const SCHEMA_NAME = 'main';

function configSignature(config: DriverConfig): string {
  return JSON.stringify({
    apiKey: config.apiKey,
    channelId: config.channelId,
    maxResults: config.maxResults,
    publishedAfter: config.publishedAfter ?? null,
    publishedBefore: config.publishedBefore ?? null,
  });
}

async function createDuckDbInstance() {
  const { DuckDBInstance } = await import('@duckdb/node-api');
  return DuckDBInstance.create(':memory:');
}

const instanceMap = new Map<string, InstanceEntry>();

const durationToSeconds = (isoDuration: string | null | undefined): number | null => {
  if (!isoDuration) {
    return null;
  }
  const match =
    /P(?:([0-9]+)D)?T?(?:([0-9]+)H)?(?:([0-9]+)M)?(?:([0-9]+)S)?/.exec(
      isoDuration,
    );
  if (!match) {
    return null;
  }
  const days = Number(match[1] ?? 0);
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  const seconds = Number(match[4] ?? 0);
  return days * 86400 + hours * 3600 + minutes * 60 + seconds;
};

const parseRfc3339 = (value: string | null | undefined): Date | null => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const escapeString = (value: string): string => value.replace(/'/g, "''");

const toTimestampLiteral = (value: string | null): string => {
  if (!value) {
    return 'NULL';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'NULL';
  }
  const iso = date.toISOString().slice(0, 19).replace('T', ' ');
  return `TIMESTAMP '${iso}'`;
};

const formatString = (value: string | null | undefined): string =>
  value === null || value === undefined ? 'NULL' : `'${escapeString(value)}'`;

const formatNumber = (value: number | null | undefined): string =>
  value === null || value === undefined ? 'NULL' : String(value);

const formatStringArray = (values: string[]): string =>
  values.length === 0
    ? 'ARRAY[]::VARCHAR[]'
    : `ARRAY[${values.map((tag) => `'${escapeString(tag)}'`).join(', ')}]`;

const buildTableSql = `
  CREATE OR REPLACE TABLE "${VIEW_NAME}" (
    videoId VARCHAR,
    title VARCHAR,
    description VARCHAR,
    publishedAt TIMESTAMP,
    channelId VARCHAR,
    channelTitle VARCHAR,
    categoryId VARCHAR,
    durationSeconds BIGINT,
    viewCount BIGINT,
    likeCount BIGINT,
    commentCount BIGINT,
    favoriteCount BIGINT,
    definition VARCHAR,
    dimension VARCHAR,
    liveBroadcastContent VARCHAR,
    tags VARCHAR[]
  );
`;

async function fetchUploadsPlaylistId(
  youtube: youtube_v3.Youtube,
  channelId: string,
): Promise<string> {
  const res = await youtube.channels.list({
    id: [channelId],
    part: ['contentDetails'],
    maxResults: 1,
  });

  if (!res.data.items || res.data.items.length === 0) {
    throw new Error(
      `Channel not found: ${channelId}. Please verify the channel ID is correct (e.g., UC...).`,
    );
  }

  const uploads =
    res.data.items[0]?.contentDetails?.relatedPlaylists?.uploads ?? null;
  if (!uploads) {
    throw new Error(
      `Channel ${channelId} does not have an uploads playlist. This may occur if the channel has no videos or the API key lacks necessary permissions.`,
    );
  }
  return uploads;
}

async function fetchPlaylistVideos(
  youtube: youtube_v3.Youtube,
  playlistId: string,
  limit: number,
): Promise<Array<{ videoId: string; publishedAt: string | null }>> {
  const collected: Array<{ videoId: string; publishedAt: string | null }> = [];
  let pageToken: string | undefined;
  while (collected.length < limit) {
    const res = await youtube.playlistItems.list({
      playlistId,
      part: ['contentDetails', 'snippet'],
      maxResults: 50,
      pageToken,
    });
    const items = res.data.items ?? [];
    for (const item of items) {
      const videoId = item.contentDetails?.videoId ?? null;
      if (!videoId) continue;
      const publishedAt =
        item.contentDetails?.videoPublishedAt ??
        item.snippet?.publishedAt ??
        null;
      collected.push({ videoId, publishedAt });
      if (collected.length >= limit) break;
    }
    if (!res.data.nextPageToken) {
      break;
    }
    pageToken = res.data.nextPageToken ?? undefined;
  }
  return collected;
}

async function fetchVideoDetails(
  youtube: youtube_v3.Youtube,
  videoIds: string[],
): Promise<VideoRow[]> {
  const rows: VideoRow[] = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50);
    const res = await youtube.videos.list({
      id: chunk,
      part: ['snippet', 'contentDetails', 'statistics'],
      maxResults: chunk.length,
    });
    for (const item of res.data.items ?? []) {
      const snippet = item.snippet ?? {};
      const stats = item.statistics ?? {};
      const content = item.contentDetails ?? {};
      rows.push({
        videoId: item.id ?? '',
        title: snippet.title ?? '',
        description: snippet.description ?? null,
        publishedAt: snippet.publishedAt ?? null,
        channelId: snippet.channelId ?? null,
        channelTitle: snippet.channelTitle ?? null,
        categoryId: snippet.categoryId ?? null,
        durationSeconds: durationToSeconds(content.duration),
        viewCount: stats.viewCount ? Number(stats.viewCount) : null,
        likeCount: stats.likeCount ? Number(stats.likeCount) : null,
        commentCount: stats.commentCount ? Number(stats.commentCount) : null,
        favoriteCount: stats.favoriteCount ? Number(stats.favoriteCount) : null,
        definition: content.definition ?? null,
        dimension: content.dimension ?? null,
        liveBroadcastContent: snippet.liveBroadcastContent ?? null,
        tags: snippet.tags ?? [],
      });
    }
  }
  return rows;
}

async function loadRowsIntoDuckDb(
  entry: InstanceEntry,
  rows: VideoRow[],
  logger?: DriverContext['logger'],
) {
  const conn = await entry.instance.connect();
  try {
    await conn.run(buildTableSql);

    if (rows.length === 0) {
      return;
    }

    const valuesSql = rows
      .map(
        (row) => `
        (${formatString(row.videoId)},
         ${formatString(row.title)},
         ${formatString(row.description)},
         ${toTimestampLiteral(row.publishedAt)},
         ${formatString(row.channelId)},
         ${formatString(row.channelTitle)},
         ${formatString(row.categoryId)},
         ${formatNumber(row.durationSeconds)},
         ${formatNumber(row.viewCount)},
         ${formatNumber(row.likeCount)},
         ${formatNumber(row.commentCount)},
         ${formatNumber(row.favoriteCount)},
         ${formatString(row.definition)},
         ${formatString(row.dimension)},
         ${formatString(row.liveBroadcastContent)},
         ${formatStringArray(row.tags)})`,
      )
      .join(',');

    await conn.run(`INSERT INTO "${VIEW_NAME}" VALUES ${valuesSql};`);
    logger?.info?.(`youtube: loaded ${rows.length} rows into duckdb`);
  } finally {
    conn.closeSync();
  }
}

async function ensureInstanceReady(
  parsed: DriverConfig,
  context: DriverContext,
): Promise<InstanceEntry> {
  const key = parsed.channelId;
  if (!instanceMap.has(key)) {
    instanceMap.set(key, { instance: await createDuckDbInstance(), signature: null });
  }
  const entry = instanceMap.get(key)!;
  const signature = configSignature(parsed);

  if (entry.signature === signature) {
    return entry;
  }

  const youtube = google.youtube({
    version: 'v3',
    auth: parsed.apiKey,
  });

  context.abortSignal?.throwIfAborted?.();

  const uploadsId = await fetchUploadsPlaylistId(youtube, parsed.channelId);
  const playlistVideos = await fetchPlaylistVideos(
    youtube,
    uploadsId,
    parsed.maxResults,
  );

  const after = parseRfc3339(parsed.publishedAfter ?? null);
  const before = parseRfc3339(parsed.publishedBefore ?? null);

  const filtered = playlistVideos.filter((video) => {
    const publishedDate = parseRfc3339(video.publishedAt);
    if (!publishedDate) return true;
    if (after && publishedDate < after) return false;
    if (before && publishedDate > before) return false;
    return true;
  });

  const limitedIds = filtered.slice(0, parsed.maxResults).map((v) => v.videoId);
  const details = limitedIds.length
    ? await fetchVideoDetails(youtube, limitedIds)
    : [];

  await loadRowsIntoDuckDb(entry, details, context.logger);
  entry.signature = signature;
  return entry;
}

function convertBigInt(value: unknown): unknown {
  if (typeof value === 'bigint') {
    if (
      value <= Number.MAX_SAFE_INTEGER &&
      value >= Number.MIN_SAFE_INTEGER
    ) {
      return Number(value);
    }
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(convertBigInt);
  }
  if (value && typeof value === 'object') {
    const converted: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      converted[key] = convertBigInt(val);
    }
    return converted;
  }
  return value;
}

async function toMetadata(entry: InstanceEntry): Promise<DatasourceMetadata> {
  const conn = await entry.instance.connect();
  try {
    return await toMetadataFromConnection(conn);
  } finally {
    conn.closeSync();
  }
}

async function toMetadataFromConnection(
  conn: {
    runAndReadAll: (sql: string) => Promise<{
      readAll: () => Promise<void>;
      getRowObjectsJS: () => Array<Record<string, unknown>>;
    }>;
  },
): Promise<DatasourceMetadata> {
    const describeReader = await conn.runAndReadAll(`DESCRIBE "${VIEW_NAME}"`);
    await describeReader.readAll();
    const describeRows = describeReader.getRowObjectsJS() as Array<{
      column_name: string;
      column_type: string;
      null: string;
    }>;

    const countReader = await conn.runAndReadAll(
      `SELECT COUNT(*) as count FROM "${VIEW_NAME}"`,
    );
    await countReader.readAll();
    const countRows = countReader.getRowObjectsJS() as Array<{ count: bigint }>;
    const rowCount = countRows[0]?.count ?? BigInt(0);

    const tableId = 1;

    const tables = [
      {
        id: tableId,
        schema: SCHEMA_NAME,
        name: VIEW_NAME,
        rls_enabled: false,
        rls_forced: false,
        bytes: 0,
        size: String(rowCount),
        live_rows_estimate: Number(rowCount),
        dead_rows_estimate: 0,
        comment: null,
        primary_keys: [],
        relationships: [],
      },
    ];

    const columns = describeRows.map((col, idx) => ({
      id: `${SCHEMA_NAME}.${VIEW_NAME}.${col.column_name}`,
      table_id: tableId,
      schema: SCHEMA_NAME,
      table: VIEW_NAME,
      name: col.column_name,
      ordinal_position: idx + 1,
      data_type: col.column_type,
      format: col.column_type,
      is_identity: false,
      identity_generation: null,
      is_generated: false,
      is_nullable: col.null === 'YES',
      is_updatable: false,
      is_unique: false,
      check: null,
      default_value: null,
      enums: [],
      comment: null,
    }));

    const schemas = [
      {
        id: 1,
        name: SCHEMA_NAME,
        owner: 'unknown',
      },
    ];

    return DatasourceMetadataZodSchema.parse({
      version: '0.0.1',
      driver: 'youtube-data-api-v3',
      schemas,
      tables,
      columns,
    });
}

export function makeYouTubeDriver(context: DriverContext): IDataSourceDriver {
  return {
    async testConnection(config: unknown): Promise<void> {
      const parsed = ConfigSchema.parse(config);
      await ensureInstanceReady(parsed, context);
      context.logger?.info?.('youtube: testConnection ok');
    },

    async metadata(config: unknown): Promise<DatasourceMetadata> {
      const parsed = ConfigSchema.parse(config);
      
      const queryEngineConn = getQueryEngineConnection(context);
      if (queryEngineConn) {
        // Use provided connection - load data into main engine
        const connection = queryEngineConn;
        const entry = await ensureInstanceReady(parsed, context);
        const conn = await entry.instance.connect();
        
        try {
          // Load data from entry instance into main connection
          const dataReader = await conn.runAndReadAll(
            `SELECT * FROM "${VIEW_NAME}"`,
          );
          await dataReader.readAll();
          const rows = dataReader.getRowObjectsJS() as Array<Record<string, unknown>>;
          
          // Create table in main connection
          await connection.run(buildTableSql);
          
          // Insert data into main connection
          if (rows.length > 0) {
            const valuesSql = rows
              .map((row) => {
                const videoId = formatString(row.videoId as string | null);
                const title = formatString(row.title as string | null);
                const description = formatString(row.description as string | null);
                const publishedAt = toTimestampLiteral(row.publishedAt as string | null);
                const channelId = formatString(row.channelId as string | null);
                const channelTitle = formatString(row.channelTitle as string | null);
                const categoryId = formatString(row.categoryId as string | null);
                const durationSeconds = formatNumber(row.durationSeconds as number | null);
                const viewCount = formatNumber(row.viewCount as number | null);
                const likeCount = formatNumber(row.likeCount as number | null);
                const commentCount = formatNumber(row.commentCount as number | null);
                const favoriteCount = formatNumber(row.favoriteCount as number | null);
                const definition = formatString(row.definition as string | null);
                const dimension = formatString(row.dimension as string | null);
                const liveBroadcastContent = formatString(row.liveBroadcastContent as string | null);
                const tags = formatStringArray((row.tags as string[]) || []);
                
                return `(${videoId}, ${title}, ${description}, ${publishedAt}, ${channelId}, ${channelTitle}, ${categoryId}, ${durationSeconds}, ${viewCount}, ${likeCount}, ${commentCount}, ${favoriteCount}, ${definition}, ${dimension}, ${liveBroadcastContent}, ${tags})`;
              })
              .join(',');
            
            await connection.run(`INSERT INTO "${VIEW_NAME}" VALUES ${valuesSql};`);
          }
          
          // Use main connection for metadata
          return toMetadataFromConnection(connection);
        } finally {
          conn.closeSync();
        }
      } else {
        // Fallback for testConnection or when no connection provided - use isolated instance
        const entry = await ensureInstanceReady(parsed, context);
        return toMetadata(entry);
      }
    },

    async query(sql: string, config: unknown): Promise<DatasourceResultSet> {
      const parsed = ConfigSchema.parse(config);
      const entry = await ensureInstanceReady(parsed, context);
      const conn = await entry.instance.connect();

      const startTime = performance.now();
      try {
        const reader = await conn.runAndReadAll(sql);
        await reader.readAll();
        const rows = reader.getRowObjectsJS() as Array<Record<string, unknown>>;
        const convertedRows = rows.map(
          (row) => convertBigInt(row) as Record<string, unknown>,
        );
        const columns = reader.columnNames().map((name: string) => ({
          name,
          displayName: name,
          originalType: null,
        }));
        const endTime = performance.now();

        return {
          columns,
          rows: convertedRows,
          stat: {
            rowsAffected: 0,
            rowsRead: convertedRows.length,
            rowsWritten: 0,
            queryDurationMs: endTime - startTime,
          },
        };
      } finally {
        conn.closeSync();
      }
    },

    async close() {
      for (const entry of instanceMap.values()) {
        entry.instance.closeSync();
      }
      instanceMap.clear();
      context.logger?.info?.('youtube: closed');
    },
  };
}

// Expose a stable factory export for the runtime loader
export const driverFactory = makeYouTubeDriver;
export default driverFactory;

