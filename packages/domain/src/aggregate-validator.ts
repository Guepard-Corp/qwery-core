/**
 * Validates that a SQL query is aggregate-only — every projected column is an aggregate
 * function call. Rejects SELECT *, GROUP BY, and bare column references.
 *
 * Intentionally restrictive: this is the privacy gate for runQuery. If unsure, the LLM
 * should use present(sql, template) instead.
 */

export const AGGREGATE_FUNCTIONS = new Set([
  'COUNT',
  'COUNT_IF',
  'SUM',
  'AVG',
  'MEAN',
  'MIN',
  'MAX',
  'MEDIAN',
  'MODE',
  'STDDEV',
  'STDDEV_POP',
  'STDDEV_SAMP',
  'VARIANCE',
  'VAR_POP',
  'VAR_SAMP',
  'PRODUCT',
  'BIT_AND',
  'BIT_OR',
  'BIT_XOR',
  'BOOL_AND',
  'BOOL_OR',
  'APPROX_COUNT_DISTINCT',
  'APPROX_QUANTILE',
  'QUANTILE',
  'QUANTILE_CONT',
  'QUANTILE_DISC',
  'PERCENTILE_CONT',
  'PERCENTILE_DISC',
  'ARG_MIN',
  'ARG_MAX',
]);

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

function splitProjections(projection: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let buf = '';
  let inStr: '"' | "'" | '`' | null = null;
  for (const ch of projection) {
    if (inStr) {
      buf += ch;
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      inStr = ch;
      buf += ch;
      continue;
    }
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      out.push(buf);
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.trim().length > 0) out.push(buf);
  return out;
}

export function validateAggregateOnly(sql: string): ValidationResult {
  const trimmed = sql.trim().replace(/;\s*$/, '');

  if (/\bGROUP\s+BY\b/i.test(trimmed)) {
    return {
      ok: false,
      reason:
        'GROUP BY is not allowed in runQuery (it produces multi-row output and can leak group keys). Use present(sql, template) instead.',
    };
  }
  if (/\bORDER\s+BY\b/i.test(trimmed)) {
    return {
      ok: false,
      reason: 'ORDER BY is not allowed in runQuery (only aggregate scalars are returned). Use present.',
    };
  }
  if (/\bLIMIT\b/i.test(trimmed)) {
    return {
      ok: false,
      reason: 'LIMIT is not allowed in runQuery (only aggregate scalars are returned). Use present.',
    };
  }

  // Extract the SELECT clause up to the first top-level FROM/WHERE/HAVING/UNION.
  // Whitespace runs are bounded ({0,64}/{1,64}) so the pattern can't backtrack
  // polynomially on adversarial input — real SQL never has 64+ spaces in a row.
  const m = trimmed.match(/^\s{0,64}SELECT\s{1,64}(.*?)(?:\s{1,64}FROM\b|\s{0,64}$)/is);
  if (!m) {
    return { ok: false, reason: 'Query must start with SELECT ... FROM.' };
  }
  const projection = m[1]!.trim();

  if (projection === '*' || /^\*/.test(projection)) {
    return { ok: false, reason: 'SELECT * is not allowed in runQuery. Specify aggregate columns only.' };
  }

  const exprs = splitProjections(projection);
  for (const raw of exprs) {
    const expr = raw.trim();
    // Strip alias suffix: "<expr> AS <alias>" or "<expr> <alias>".
    const withoutAlias = expr
      .replace(/\s{1,64}AS\s{1,64}["`]?\w{1,256}["`]?\s{0,64}$/i, '')
      .replace(/\s{1,64}["`]?\w{1,256}["`]?\s{0,64}$/i, (match) => {
        // Only strip a bare-identifier alias if it appears AFTER a closed paren or quote.
        const before = expr.slice(0, expr.length - match.length);
        return /[)"'`]\s*$/.test(before) ? '' : match;
      });
    const fn = withoutAlias.match(/^\s*([A-Za-z_][\w]*)\s*\(/);
    if (!fn) {
      return {
        ok: false,
        reason: `Expression '${expr}' is not an aggregate function call. runQuery requires every column to be COUNT/SUM/AVG/MIN/MAX/... — use present for tabular output.`,
      };
    }
    if (!AGGREGATE_FUNCTIONS.has(fn[1]!.toUpperCase())) {
      return {
        ok: false,
        reason: `'${fn[1]}' is not a known aggregate function. Allowed: ${[...AGGREGATE_FUNCTIONS].slice(0, 12).join(', ')}, … (or use present for non-aggregate output).`,
      };
    }
  }

  return { ok: true };
}
