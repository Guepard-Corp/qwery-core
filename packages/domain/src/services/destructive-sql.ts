/**
 * Classifies SQL as destructive to drive GFS auto-branching (ADR #11, roadmap #9).
 *
 * The classifier is the trigger for the safety net: before a destructive
 * statement runs against a branchable datasource the application snapshots it
 * via GFS; against a non-branchable one it asks the user to confirm. Detection
 * is **best-effort** by design (ADR #11) — we mask strings/comments and scan
 * tokens rather than embed a full SQL parser. The bias is deliberately
 * conservative: a false positive only costs a cheap GFS commit, while a false
 * negative would let an unguarded mutation through.
 */

export type SqlOperation =
  | 'SELECT'
  | 'INSERT'
  | 'UPDATE'
  | 'DELETE'
  | 'DROP'
  | 'TRUNCATE'
  | 'ALTER'
  | 'RENAME'
  | 'CREATE'
  | 'OTHER';

export interface DestructiveStatement {
  /** Leading command of the statement (resolving a leading CTE to its inner command). */
  operation: SqlOperation;
  destructive: boolean;
  /** Whether a WHERE clause was found — informational; subquery WHEREs are not distinguished. */
  scoped: boolean;
  reason?: string;
}

export interface DestructiveSqlReport {
  /** True if any statement in the input is destructive. */
  destructive: boolean;
  statements: DestructiveStatement[];
  /** Human-readable reasons, suitable for an auto-commit message or a confirmation prompt. */
  reasons: string[];
}

const COMMAND_KEYWORDS = new Set<SqlOperation>([
  'SELECT',
  'INSERT',
  'UPDATE',
  'DELETE',
  'DROP',
  'TRUNCATE',
  'ALTER',
  'RENAME',
  'CREATE',
]);

/**
 * Strip comments and neutralize string literals / quoted identifiers / dollar
 * quotes so that keywords appearing *inside* them (e.g. `SELECT 'DROP TABLE x'`)
 * never trigger a match.
 */
/**
 * Replace each `/* ... *\/` block comment with a space. Uses an indexOf scan
 * (no regex) so it is strictly linear — no ReDoS surface. An unterminated `/*`
 * is left as-is, matching the old lazy-regex behaviour.
 */
function stripBlockComments(sql: string): string {
  let out = '';
  let i = 0;
  while (i < sql.length) {
    const start = sql.indexOf('/*', i);
    if (start === -1) {
      out += sql.slice(i);
      break;
    }
    const end = sql.indexOf('*/', start + 2);
    if (end === -1) {
      out += sql.slice(i); // unterminated comment — keep the remainder verbatim
      break;
    }
    out += `${sql.slice(i, start)} `;
    i = end + 2;
  }
  return out;
}

function mask(sql: string): string {
  return stripBlockComments(sql)
    .replace(/--[^\n]*/g, ' ') // line comments
    .replace(/\$([A-Za-z0-9_]*)\$[\s\S]*?\$\1\$/g, "''") // dollar-quoted strings
    .replace(/'(?:[^']|'')*'/g, "''") // single-quoted strings (with '' escapes)
    .replace(/"(?:[^"]|"")*"/g, '""'); // double-quoted identifiers
}

/** Split on top-level `;` after masking (so semicolons inside strings are safe). */
function splitStatements(maskedSql: string): string[] {
  return maskedSql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function firstWord(statement: string): string {
  const match = statement.match(/[A-Za-z]+/);
  return match ? match[0].toUpperCase() : '';
}

/** Resolve the operative command, looking past a leading CTE (`WITH …`). */
function resolveOperation(statement: string): SqlOperation {
  const head = firstWord(statement);
  if (head !== 'WITH') {
    return COMMAND_KEYWORDS.has(head as SqlOperation) ? (head as SqlOperation) : 'OTHER';
  }
  // A data-modifying CTE (`WITH t AS (DELETE …) …`) or a CTE feeding a final
  // command — pick the strongest command keyword present, mutations first.
  for (const op of ['DROP', 'TRUNCATE', 'DELETE', 'UPDATE', 'ALTER', 'RENAME', 'INSERT'] as SqlOperation[]) {
    if (new RegExp(`\\b${op}\\b`, 'i').test(statement)) return op;
  }
  return 'SELECT';
}

function classifyStatement(statement: string): DestructiveStatement {
  const operation = resolveOperation(statement);
  const scoped = /\bWHERE\b/i.test(statement);

  switch (operation) {
    case 'DROP':
      return { operation, destructive: true, scoped, reason: 'DROP removes a table or object' };
    case 'TRUNCATE':
      return { operation, destructive: true, scoped, reason: 'TRUNCATE empties a table' };
    case 'DELETE':
      return {
        operation,
        destructive: true,
        scoped,
        reason: scoped ? 'DELETE with WHERE removes rows' : 'DELETE without WHERE removes all rows',
      };
    case 'UPDATE':
      return {
        operation,
        destructive: !scoped,
        scoped,
        reason: scoped ? undefined : 'UPDATE without WHERE rewrites all rows',
      };
    case 'ALTER':
      return { operation, destructive: true, scoped, reason: 'ALTER changes the schema' };
    case 'RENAME':
      return { operation, destructive: true, scoped, reason: 'RENAME changes the schema' };
    default:
      return { operation, destructive: false, scoped };
  }
}

export function classifyDestructiveSql(sql: string): DestructiveSqlReport {
  const statements = splitStatements(mask(sql)).map(classifyStatement);
  const destructiveStatements = statements.filter((s) => s.destructive);
  return {
    destructive: destructiveStatements.length > 0,
    statements,
    reasons: destructiveStatements.map((s) => s.reason).filter((r): r is string => Boolean(r)),
  };
}
