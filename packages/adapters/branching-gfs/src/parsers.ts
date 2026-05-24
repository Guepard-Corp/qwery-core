import type { BranchInfo, BranchingStatus, SchemaDiff } from '@qwery/domain';

/** Pure parsers for gfs CLI output, kept separate from the process boundary so they unit-test without the binary. */

export function parseVersion(stdout: string): string | undefined {
  // Bounded quantifiers (no unbounded \d+) keep the match linear — ReDoS-safe.
  return stdout.match(/(\d{1,9}\.\d{1,9}\.\d{1,9})/)?.[1];
}

/** Extract the HEAD commit hash from `gfs log --full-hash` output. */
export function parseHead(logStdout: string): string | undefined {
  return logStdout.match(/commit\s+([0-9a-f]{64})/)?.[1];
}

interface GfsStatusJson {
  current_branch?: string;
  compute?: {
    provider?: string;
    version?: string;
    container_status?: string;
    connection_string?: string;
  };
}

export function parseStatusJson(stdout: string, head?: string): BranchingStatus {
  const json = JSON.parse(stdout) as GfsStatusJson;
  const compute = json.compute ?? {};
  const containerStatus = compute.container_status ?? 'unknown';
  const connectionString = compute.connection_string?.trim() || undefined;
  return {
    currentBranch: json.current_branch ?? 'main',
    head,
    provider: compute.provider,
    providerVersion: compute.version,
    containerStatus,
    containerRunning: containerStatus === 'running',
    connectionString,
  };
}

/**
 * Branch names from the `gfs log` decoration on the first commit line, e.g.
 * `commit abc… (HEAD -> main, dev)`. gfs has no branch-list command, so this is
 * best-effort: it only surfaces branches pointing at the latest commit. The
 * known current branch is always included.
 */
export function parseBranchDecoration(logStdout: string, currentBranch: string): BranchInfo[] {
  // Bounded hash length (git sha ≤ 64 hex) avoids polynomial backtracking.
  const decoration = logStdout.match(/commit\s{1,8}[0-9a-f]{1,64}\s{1,8}\(([^)]*)\)/)?.[1];
  const names = new Set<string>([currentBranch]);
  if (decoration) {
    for (const raw of decoration.split(',')) {
      const name = raw.replace(/HEAD\s*->\s*/, '').trim();
      if (name && !name.includes('->')) names.add(name);
    }
  }
  return Array.from(names, (name) => ({ name, isCurrent: name === currentBranch }));
}

function readNumber(obj: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'number') return value;
  }
  return 0;
}

export function parseSchemaDiffJson(stdout: string): SchemaDiff {
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(stdout) as Record<string, unknown>;
  } catch {
    // Non-JSON output (older builds / unexpected format): keep raw, report identical=false.
    return {
      identical: false,
      tablesAdded: 0,
      tablesRemoved: 0,
      columnsAdded: 0,
      columnsRemoved: 0,
      raw: stdout,
    };
  }
  const identical = json.identical === true || json.schema_hash_match === true || json.changed === false;
  return {
    identical,
    tablesAdded: readNumber(json, 'tables_added', 'tablesAdded'),
    tablesRemoved: readNumber(json, 'tables_removed', 'tablesRemoved'),
    columnsAdded: readNumber(json, 'columns_added', 'columnsAdded'),
    columnsRemoved: readNumber(json, 'columns_removed', 'columnsRemoved'),
    raw: stdout,
  };
}
