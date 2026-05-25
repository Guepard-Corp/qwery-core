/**
 * Branching port — database version control backed by GFS (ADR #11).
 *
 * GFS is qwery's safety layer against destructive agent actions: it hosts a
 * separate, versioned, composable working copy of a datasource that the agent
 * can branch, commit, diff and roll back without touching the real database.
 *
 * Scope: this port maps to the **gfs binary primitives** (version-control +
 * container/import lifecycle). A GFS-hosted base is a real Postgres/MySQL
 * instance, so querying it reuses the existing datasource drivers pointed at
 * the connection string from `status()` — there is no GFS-specific query path
 * here. Higher-level composition (materialize a source at schema/sample/full,
 * enrich from other sources) lives in application use cases that combine this
 * port with the source datasource drivers.
 */

/** How much of a source database is pulled into a GFS working copy. */
export type MaterializationLevel = 'schema' | 'sample' | 'full';

export interface MaterializationSpec {
  level: MaterializationLevel;
  /** For `sample`: max rows per table (top-N). Ignored otherwise. */
  sampleSize?: number;
  /** Optional row filter applied when sampling (e.g. a WHERE predicate). */
  where?: string;
}

/** Where the data in a GFS base came from — tracked so the agent and user know what they manipulate. */
export interface Provenance {
  sourceDatasourceId: string;
  level: MaterializationLevel;
  rowCount?: number;
  capturedAt: Date;
}

export interface InitSpec {
  provider: 'postgres' | 'mysql';
  /** Engine version as gfs expects it, e.g. "17" or "8.0". */
  databaseVersion: string;
}

export interface ImportPayload {
  /** Path to a dump/data file to load into the running GFS database. */
  filePath: string;
  format?: 'sql' | 'csv' | 'json' | 'custom';
}

export interface BranchInfo {
  name: string;
  isCurrent: boolean;
}

export interface BranchingStatus {
  currentBranch: string;
  /** HEAD commit hash, when resolvable from history. */
  head?: string;
  provider?: string;
  providerVersion?: string;
  /** Raw container state reported by gfs (e.g. "running", "not_provisioned"). */
  containerStatus: string;
  containerRunning: boolean;
  /** Connection string of the running GFS container, when up. */
  connectionString?: string;
}

export interface SchemaDiff {
  /** True when both revisions resolve to the same schema. */
  identical: boolean;
  tablesAdded: number;
  tablesRemoved: number;
  columnsAdded: number;
  columnsRemoved: number;
  /** Raw gfs output, for display when structured fields are insufficient. */
  raw: string;
}

export interface Branching {
  /** Whether the GFS binary is installed and usable. */
  isAvailable(): Promise<boolean>;
  /** Installed GFS version (e.g. "0.1.13"), or undefined when unavailable. */
  version(): Promise<string | undefined>;
  status(): Promise<BranchingStatus>;

  /** Initialize a GFS repo + provision the database container. */
  init(spec: InitSpec): Promise<void>;
  /** Load a dump/data file into the running GFS database. */
  importData(payload: ImportPayload): Promise<void>;

  /** Record a commit and return its HEAD hash. */
  commit(message: string): Promise<string>;
  /** Create and switch to a branch (optionally from a start revision). */
  branch(name: string, startRevision?: string): Promise<BranchInfo>;
  checkout(revision: string): Promise<void>;
  listBranches(): Promise<BranchInfo[]>;
  diff(from: string, to: string): Promise<SchemaDiff>;
}

export class GfsUnavailableError extends Error {
  constructor() {
    super('GFS is not installed. Install it to enable database branching (https://gfs.guepard.run/install).');
    this.name = 'GfsUnavailableError';
  }
}

export class GfsCommandError extends Error {
  constructor(
    public readonly command: string,
    public readonly exitCode: number,
    public readonly stderr: string,
  ) {
    super(`gfs ${command} failed (exit ${exitCode}): ${stderr.trim()}`);
    this.name = 'GfsCommandError';
  }
}
