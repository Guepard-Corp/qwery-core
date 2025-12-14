import type {
  Datasource,
  DatasourceMetadata,
  DatasourceResultSet,
} from '../entities';
import { z } from 'zod';

/**
 * URI scheme validator for working directory paths.
 * Supports various storage and protocol schemes:
 * - file:// - Local file system
 * - s3:// - Amazon S3
 * - az:// or azure:// - Azure Blob Storage
 * - http:// or https:// - HTTP/HTTPS endpoints
 * - hf:// - Hugging Face Hub
 * - gs:// - Google Cloud Storage
 */
const WorkingDirUriSchema = z.string().refine(
  (val) => {
    const url = new URL(val);
    const protocol = url.protocol.replace(':', '');
    return ['file', 's3', 'az', 'azure', 'http', 'https', 'hf', 'gs'].includes(
      protocol,
    );
  },
  {
    message:
      'workingDir must be a valid URI with supported scheme (file://, s3://, az://, azure://, http://, https://, hf://, gs://)',
  },
);

/**
 * Configuration schema for query engine initialization.
 */
export const QueryEngineConfigSchema = z.object({
  /**
   * Working directory URI where the engine stores temporary files, caches, and state.
   * Must be a valid URI with one of the supported schemes:
   * - file:///path/to/dir - Local file system
   * - s3://bucket/path - Amazon S3
   * - az://container/path or azure://container/path - Azure Blob Storage
   * - http://host/path or https://host/path - HTTP/HTTPS endpoints
   * - hf://repo/path - Hugging Face Hub
   * - gs://bucket/path - Google Cloud Storage
   */
  workingDir: WorkingDirUriSchema,
  /**
   * Engine-specific configuration options.
   * Each engine implementation can define its own configuration schema.
   */
  config: z.record(z.string(), z.unknown()),
});

export type QueryEngineConfig = z.infer<typeof QueryEngineConfigSchema>;

/**
 * Abstract port for federated query engines.
 *
 * This port defines the interface for query engines that can execute SQL queries
 * across multiple datasources in a federated manner. Implementations can use
 * engines like DuckDB, Apache Calcite, or other federated query systems.
 *
 * @template T - The type of query result returned by the engine implementation.
 *               Typically an array of rows or a structured result object.
 *
 * @example
 * ```typescript
 * class DuckDBQueryEngine extends AbstractQueryEngine<QueryResult> {
 *   async initialize(config: QueryEngineConfig) {
 *     // Initialize DuckDB with working directory
 *   }
 *
 *   async attach(datasources: Datasource[]) {
 *     // Attach datasources to DuckDB
 *   }
 *
 *   async query(query: string) {
 *     // Execute query and return results
 *   }
 * }
 * ```
 */
export abstract class AbstractQueryEngine {
  /**
   * Initialize the query engine with the provided configuration.
   *
   * This method should:
   * - Set up the engine instance
   * - Configure the working directory for temporary files and state
   * - Apply engine-specific configuration options
   * - Prepare the engine for datasource attachment
   *
   * @param config - Engine configuration including working directory URI and options
   * @throws {Error} If initialization fails or configuration is invalid
   */
  abstract initialize(config: QueryEngineConfig): Promise<void>;

  /**
   * Attach one or more datasources to the query engine.
   *
   * This method registers datasources with the engine, making them available
   * for federated queries. The engine should:
   * - Establish connections to the datasources
   * - Register schemas and tables
   * - Cache metadata if needed
   * - Handle connection errors gracefully
   *
   * @param datasources - Array of datasources to attach
   * @throws {Error} If attachment fails for any datasource
   */
  abstract attach(datasources: Datasource[]): Promise<void>;

  /**
   * Detach one or more datasources from the query engine.
   *
   * This method removes datasources from the engine, closing connections
   * and freeing resources. The engine should:
   * - Close connections to the datasources
   * - Remove registered schemas and tables
   * - Clean up cached metadata
   * - Handle errors gracefully
   *
   * @param datasources - Array of datasources to detach
   * @throws {Error} If detachment fails for any datasource
   */
  abstract detach(datasources: Datasource[]): Promise<void>;

  /**
   * Establish connections to all attached datasources.
   *
   * This method should:
   * - Verify connectivity to all attached datasources
   * - Validate credentials and permissions
   * - Prepare the engine for query execution
   *
   * @throws {Error} If connection fails for any datasource
   */
  abstract connect(): Promise<void>;

  /**
   * Close all connections and clean up resources.
   *
   * This method should:
   * - Close all datasource connections
   * - Release memory and resources
   * - Clean up temporary files if needed
   * - Prepare the engine for shutdown or reinitialization
   *
   * @throws {Error} If cleanup fails
   */
  abstract close(): Promise<void>;

  /**
   * Execute a SQL query across attached datasources.
   *
   * This method should:
   * - Parse and validate the SQL query
   * - Plan and optimize the federated query execution
   * - Execute the query across relevant datasources
   * - Combine results from multiple datasources
   * - Return results in the engine-specific format
   *
   * @param query - SQL query string to execute
   * @returns Promise resolving to query results in type T
   * @throws {Error} If query execution fails, query is invalid, or datasources are unavailable
   */
  abstract query(query: string): Promise<DatasourceResultSet>;

  /**
   * Retrieve metadata for attached datasources.
   *
   * This method should:
   * - Collect schema information from datasources
   * - Aggregate metadata across all datasources
   * - Return unified metadata structure
   * - Cache metadata if appropriate
   *
   * @param datasources - Optional array of specific datasources to query.
   *                     If not provided, returns metadata for all attached datasources.
   * @returns Promise resolving to aggregated datasource metadata
   * @throws {Error} If metadata retrieval fails
   */
  abstract metadata(datasources?: Datasource[]): Promise<DatasourceMetadata>;
}

/**
 * Factory function to create an instance of a AbstractQueryEngine implementation
 * without using the `new` keyword.
 *
 * @param EngineClass - The class constructor for the query engine implementation
 * @returns A new instance of the query engine
 *
 * @example
 * ```typescript
 * const engine = createQueryEngine(DuckDBQueryEngine);
 * await engine.initialize({ workingDir: 'file:///tmp/engine', config: {} });
 * ```
 */
export function createQueryEngine<E extends AbstractQueryEngine>(
  EngineClass: new () => E,
): E {
  return new EngineClass();
}
