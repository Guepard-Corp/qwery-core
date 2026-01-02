import type {
  BusinessContext,
  BusinessEntity,
  VocabularyEntry,
  ViewMetadata,
} from '../types/business-context.types';

const BUSINESS_CONTEXT_FILE = 'business-context.json';

/**
 * Detects the storage protocol from a URI or path.
 * Returns the protocol (without colon) or 'file' for local paths.
 */
function detectProtocol(pathOrUri: string): string {
  // Treat Windows absolute paths as local files: C:\... or C:/...
  if (/^[a-zA-Z]:[\\/]/.test(pathOrUri)) return 'file';

  // Treat UNC paths (\\server\share\...) as local files too
  if (pathOrUri.startsWith('\\\\')) return 'file';

  // Treat relative paths as local files
  if (!pathOrUri.includes('://')) return 'file';

  try {
    const url = new URL(pathOrUri);
    return url.protocol.replace(':', '');
  } catch {
    return 'file';
  }
}


/**
 * Joins a URI path with a filename, handling both URI and local path formats.
 */
async function joinPath(basePath: string, filename: string): Promise<string> {
  const protocol = detectProtocol(basePath);

  if (protocol === 'file') {
    // Handle both URI format (file:///path) and local path
    let normalizedPath = basePath;
    if (basePath.startsWith('file://')) {
      normalizedPath = basePath.replace('file://', '');
      // Remove leading slash for Windows compatibility
      if (normalizedPath.startsWith('/') && process.platform === 'win32') {
        normalizedPath = normalizedPath.substring(1);
      }
    }
    const { join } = await import('node:path');
    return join(normalizedPath, filename);
  }

  // For URI-based storage (s3://, etc.), append filename with proper separator
  const separator = basePath.endsWith('/') ? '' : '/';
  return `${basePath}${separator}${filename}`;
}

/**
 * Reads file content from various storage backends.
 */
async function readFileContent(filePath: string): Promise<string> {
  const protocol = detectProtocol(filePath);

  if (protocol === 'file') {
    const { readFile } = await import('node:fs/promises');
    // Handle file:// URI format
    let normalizedPath = filePath;
    if (filePath.startsWith('file://')) {
      normalizedPath = filePath.replace('file://', '');
      if (normalizedPath.startsWith('/') && process.platform === 'win32') {
        normalizedPath = normalizedPath.substring(1);
      }
    }
    return await readFile(normalizedPath, 'utf-8');
  }

  if (protocol === 's3') {
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    const url = new URL(filePath);
    const bucket = url.hostname;
    const key = url.pathname.startsWith('/')
      ? url.pathname.substring(1)
      : url.pathname;

    // Build S3 client configuration
    const s3Config: {
      region: string;
      endpoint?: string;
      credentials?: {
        accessKeyId: string;
        secretAccessKey: string;
      };
      forcePathStyle?: boolean;
    } = {
      region:
        process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
    };

    // Support custom endpoints (e.g., MinIO)
    if (process.env.S3_ENDPOINT) {
      let endpoint = process.env.S3_ENDPOINT;
      // Normalize endpoint to include protocol if missing
      if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
        const useSsl = process.env.S3_USE_SSL === 'true';
        endpoint = `${useSsl ? 'https' : 'http'}://${endpoint}`;
      }
      s3Config.endpoint = endpoint;
      // Default to path style for custom endpoints (required for MinIO)
      s3Config.forcePathStyle = process.env.S3_URL_STYLE !== 'virtual-hosted';
    }

    // Support custom credentials (e.g., MinIO)
    if (process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY) {
      s3Config.credentials = {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      };
    }

    const s3Client = new S3Client(s3Config);

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);
    if (!response.Body) {
      throw new Error(`S3 object ${filePath} has no body`);
    }

    // Convert stream to string
    const chunks: Uint8Array[] = [];
    if (
      response.Body &&
      typeof response.Body === 'object' &&
      Symbol.asyncIterator in response.Body
    ) {
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
    } else {
      throw new Error(`S3 object ${filePath} body is not iterable`);
    }
    const buffer = Buffer.concat(chunks);
    return buffer.toString('utf-8');
  }

  throw new Error(
    `Unsupported storage protocol: ${protocol} for path: ${filePath}`,
  );
}

/**
 * Writes file content to various storage backends.
 */
async function writeFileContent(
  filePath: string,
  content: string,
): Promise<void> {
  const protocol = detectProtocol(filePath);

  if (protocol === 'file') {
    const { mkdir, writeFile } = await import('node:fs/promises');
    const { dirname } = await import('node:path');

    // Handle file:// URI format
    let normalizedPath = filePath;
    if (filePath.startsWith('file://')) {
      normalizedPath = filePath.replace('file://', '');
      if (normalizedPath.startsWith('/') && process.platform === 'win32') {
        normalizedPath = normalizedPath.substring(1);
      }
    }

    const dir = dirname(normalizedPath);
    await mkdir(dir, { recursive: true });
    await writeFile(normalizedPath, content, 'utf-8');
    return;
  }

  if (protocol === 's3') {
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const url = new URL(filePath);
    const bucket = url.hostname;
    const key = url.pathname.startsWith('/')
      ? url.pathname.substring(1)
      : url.pathname;

    // Build S3 client configuration
    const s3Config: {
      region: string;
      endpoint?: string;
      credentials?: {
        accessKeyId: string;
        secretAccessKey: string;
      };
      forcePathStyle?: boolean;
    } = {
      region:
        process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
    };

    // Support custom endpoints (e.g., MinIO)
    if (process.env.S3_ENDPOINT) {
      let endpoint = process.env.S3_ENDPOINT;
      // Normalize endpoint to include protocol if missing
      if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
        const useSsl = process.env.S3_USE_SSL === 'true';
        endpoint = `${useSsl ? 'https' : 'http'}://${endpoint}`;
      }
      s3Config.endpoint = endpoint;
      // Default to path style for custom endpoints (required for MinIO)
      s3Config.forcePathStyle = process.env.S3_URL_STYLE !== 'virtual-hosted';
    }

    // Support custom credentials (e.g., MinIO)
    if (process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY) {
      s3Config.credentials = {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      };
    }

    const s3Client = new S3Client(s3Config);

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: content,
      ContentType: 'application/json',
    });

    await s3Client.send(command);
    return;
  }

  throw new Error(
    `Unsupported storage protocol: ${protocol} for path: ${filePath}`,
  );
}

/**
 * Create empty business context
 */
export function createEmptyContext(): BusinessContext {
  return {
    entities: new Map(),
    vocabulary: new Map(),
    relationships: [],
    entityGraph: new Map(),
    domain: {
      domain: 'general',
      confidence: 0.5,
      keywords: [],
      alternativeDomains: [],
    },
    views: new Map(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Load business context from file
 */
export async function loadBusinessContext(
  conversationDir: string,
): Promise<BusinessContext | null> {
  const contextPath = await joinPath(conversationDir, BUSINESS_CONTEXT_FILE);

  try {
    const content = await readFileContent(contextPath);
    const data = JSON.parse(content);

    // Reconstruct Maps from JSON with proper types
    const entities = new Map<string, BusinessEntity>();
    if (data.entities) {
      for (const [key, value] of data.entities) {
        entities.set(key, value as BusinessEntity);
      }
    }

    const vocabulary = new Map<string, VocabularyEntry>();
    if (data.vocabulary) {
      // Handle both old format (Map<string, string>) and new format (Map<string, VocabularyEntry>)
      for (const [key, value] of data.vocabulary) {
        if (typeof value === 'string') {
          // Old format - convert to new format
          vocabulary.set(key, {
            businessTerm: value,
            technicalTerms: [key],
            confidence: 0.8,
            synonyms: [],
          });
        } else {
          vocabulary.set(key, value as VocabularyEntry);
        }
      }
    }

    const views = new Map<string, ViewMetadata>();
    if (data.views) {
      for (const [key, value] of data.views) {
        views.set(key, value as ViewMetadata);
      }
    }

    return {
      entities,
      vocabulary,
      relationships: data.relationships || [],
      entityGraph: new Map(data.entityGraph || []),
      domain: data.domain || {
        domain: 'general',
        confidence: 0.5,
        keywords: [],
        alternativeDomains: [],
      },
      views,
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Save business context to file
 */
export async function saveBusinessContext(
  conversationDir: string,
  context: BusinessContext,
): Promise<void> {
  const contextPath = await joinPath(conversationDir, BUSINESS_CONTEXT_FILE);

  // Convert Maps to arrays for JSON serialization
  const serializable = {
    entities: Array.from(context.entities.entries()),
    vocabulary: Array.from(context.vocabulary.entries()),
    relationships: context.relationships,
    entityGraph: Array.from(context.entityGraph.entries()),
    domain: context.domain,
    views: Array.from(context.views.entries()),
    updatedAt: new Date().toISOString(),
  };

  await writeFileContent(contextPath, JSON.stringify(serializable, null, 2));
}

/**
 * Merge multiple business contexts into one
 * Used when processing multiple views to combine fast contexts
 */
export function mergeBusinessContexts(
  contexts: BusinessContext[],
): BusinessContext {
  if (contexts.length === 0) {
    return createEmptyContext();
  }

  if (contexts.length === 1) {
    const first = contexts[0];
    if (!first) {
      return createEmptyContext();
    }
    return first;
  }

  const merged: BusinessContext = {
    entities: new Map(),
    vocabulary: new Map(),
    relationships: [], // Empty - enhanced path will populate
    entityGraph: new Map(), // Empty - enhanced path will populate
    domain: {
      domain: 'general',
      confidence: 0.5,
      keywords: [],
      alternativeDomains: [],
    }, // Default - enhanced path will populate
    views: new Map(),
    updatedAt: new Date().toISOString(),
  };

  // Merge entities
  for (const context of contexts) {
    for (const [entityKey, entity] of context.entities.entries()) {
      const existing = merged.entities.get(entityKey);
      if (existing) {
        // Merge columns (deduplicate)
        for (const col of entity.columns) {
          if (!existing.columns.includes(col)) {
            existing.columns.push(col);
          }
        }
        // Merge views (deduplicate)
        for (const view of entity.views) {
          if (!existing.views.includes(view)) {
            existing.views.push(view);
          }
        }
        // Use max confidence
        existing.confidence = Math.max(existing.confidence, entity.confidence);
      } else {
        merged.entities.set(entityKey, { ...entity });
      }
    }
  }

  // Merge vocabulary
  for (const context of contexts) {
    for (const [term, entry] of context.vocabulary.entries()) {
      const existing = merged.vocabulary.get(term);
      if (existing) {
        // Merge technical terms (deduplicate)
        for (const techTerm of entry.technicalTerms) {
          if (!existing.technicalTerms.includes(techTerm)) {
            existing.technicalTerms.push(techTerm);
          }
        }
        // Use max confidence
        existing.confidence = Math.max(existing.confidence, entry.confidence);
      } else {
        merged.vocabulary.set(term, { ...entry });
      }
    }
  }

  // Merge views
  for (const context of contexts) {
    for (const [viewName, metadata] of context.views.entries()) {
      merged.views.set(viewName, metadata);
    }
  }

  return merged;
}
