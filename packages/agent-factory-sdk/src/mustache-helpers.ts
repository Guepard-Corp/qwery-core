import Mustache from 'mustache';

// Terminal output — never escape HTML.
Mustache.escape = (s: string) => s;

type LambdaInput = string;
type Lambda = () => (text: LambdaInput, render: (t: string) => string) => string;

function asNumber(s: string): number | null {
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const money: Lambda = () => (text, render) => {
  const n = asNumber(render(text));
  if (n === null) return render(text);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
};

const int: Lambda = () => (text, render) => {
  const n = asNumber(render(text));
  if (n === null) return render(text);
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
};

const pct: Lambda = () => (text, render) => {
  const n = asNumber(render(text));
  if (n === null) return render(text);
  // Treat values in [0,1] as fractions; > 1 as already-percent.
  const value = Math.abs(n) <= 1 ? n * 100 : n;
  return `${value.toFixed(1)}%`;
};

const date: Lambda = () => (text, render) => {
  const raw = render(text);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
};

export const MUSTACHE_HELPERS = { money, int, pct, date };

export const HELPER_NAMES = Object.keys(MUSTACHE_HELPERS);

function fmtCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'bigint' || typeof v === 'boolean') return String(v);
  return JSON.stringify(v);
}

function isNumericColumn(rows: Array<Record<string, unknown>>, col: string): boolean {
  for (const r of rows) {
    const v = r[col];
    if (v === null || v === undefined) continue;
    return typeof v === 'number' || typeof v === 'bigint';
  }
  return false;
}

/**
 * Sentinel marker emitted by the `{{table}}` Mustache variable.
 * Consumers split the rendered string on this token to splice in a richer
 * Ink component (e.g. `<Table>`). Falls back to ASCII when not handled.
 */
export const TABLE_SENTINEL = '​[[QWERY:TABLE]]​';

/** Render rows as an aligned ASCII table (Unicode separators, right-align numerics). */
export function renderAlignedTable(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return '(no rows)';
  const cols = Object.keys(rows[0]!);
  const widths = cols.map((c) => Math.max(c.length, ...rows.map((r) => fmtCell(r[c]).length)));
  const numeric = new Set(cols.filter((c) => isNumericColumn(rows, c)));

  const padCell = (s: string, w: number, col: string): string =>
    numeric.has(col) ? s.padStart(w) : s.padEnd(w);

  const head = cols.map((c, i) => padCell(c, widths[i]!, c)).join('  ');
  const sep = widths.map((w) => '─'.repeat(w)).join('  ');
  const body = rows
    .map((r) => cols.map((c, i) => padCell(fmtCell(r[c]), widths[i]!, c)).join('  '))
    .join('\n');
  return `${head}\n${sep}\n${body}`;
}

/**
 * Render a Mustache template against a query result.
 * Context exposes `rows`, `first`, `rowCount`, `table` (variable → aligned table string),
 * plus the helper section lambdas (`money`, `int`, `pct`, `date`).
 */
export function renderTemplate(template: string, rows: Array<Record<string, unknown>>): string {
  const ctx: Record<string, unknown> = {
    rows,
    first: rows[0] ?? null,
    rowCount: rows.length,
    table: () => TABLE_SENTINEL,
    ...MUSTACHE_HELPERS,
  };
  return Mustache.render(template, ctx);
}

/**
 * Find references in a Mustache template that don't match any known column or helper.
 * Conservative: catches simple `{{name}}` and `{{#name}}` cases. Inside `{{#rows}}...{{/rows}}`,
 * column references are scoped to each row, so we check them against the column list.
 */
export function validateTemplateColumns(template: string, columns: string[]): string[] {
  const known = new Set([...columns, ...HELPER_NAMES, 'rows', 'first', 'rowCount', 'table', '.']);
  const refs = new Set<string>();
  const re = /\{\{[#^/&]?\s*([\w.]+)\s*\}\}/g;
  let m = re.exec(template);
  while (m !== null) {
    refs.add(m[1]!);
    m = re.exec(template);
  }
  return [...refs].filter((r) => !known.has(r));
}
