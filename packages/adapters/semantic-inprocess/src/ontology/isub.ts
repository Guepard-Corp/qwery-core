/**
 * I-SUB string similarity (Stoilos, Stamou & Kollias, 2005), ported verbatim
 * from the reference Python implementation. Output is clamped to [0, 1].
 *
 * The metric rewards shared substrings (COMM) and penalizes the unmatched
 * residuals (DIFF) via a Hamacher product, which makes it robust to the
 * abbreviation/affix noise common in physical column names — e.g.
 * `revenue` vs `gross_revenue_usd`.
 */

/** Minimum common-substring length; shorter overlaps are treated as accidental. */
export const ISUB_MIN_SUBSTR = 3;

/** Hamacher product parameter for the DIFF term (Stoilos 2005, §3.2). */
const ISUB_WINKLER = 0.6;

/**
 * Longest common substring of `a` and `b`. Uses a rolling row (O(min(m,n))
 * space), sufficient for the short identifier strings this operates on.
 */
export function longestCommonSubstring(a: string, b: string): string {
  if (!a || !b) {
    return '';
  }
  const m = a.length;
  const n = b.length;
  let prev = new Array<number>(n + 1).fill(0);
  let bestLen = 0;
  let bestEnd = 0;
  for (let i = 1; i <= m; i++) {
    const cur = new Array<number>(n + 1).fill(0);
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        cur[j] = prev[j - 1] + 1;
        if (cur[j] > bestLen) {
          bestLen = cur[j];
          bestEnd = i;
        }
      }
    }
    prev = cur;
  }
  return bestLen ? a.slice(bestEnd - bestLen, bestEnd) : '';
}

/**
 * I-SUB similarity between `a` and `b`, case-insensitive, in [0, 1].
 * `minSubstr` lets callers tune the accidental-match floor (default 3).
 */
export function isub(a: string, b: string, minSubstr: number = ISUB_MIN_SUBSTR): number {
  const aL = (a || '').toLowerCase();
  const bL = (b || '').toLowerCase();
  if (!aL || !bL) {
    return 0;
  }
  if (aL === bL) {
    return 1;
  }

  let common = 0;
  let sa = aL;
  let sb = bL;
  while (true) {
    const match = longestCommonSubstring(sa, sb);
    if (match.length < minSubstr) {
      break;
    }
    common += match.length;
    sa = sa.replace(match, '');
    sb = sb.replace(match, '');
  }

  if (common === 0) {
    return 0;
  }

  const comm = (2 * common) / (aL.length + bL.length);
  const ula = sa.length / Math.max(1, aL.length);
  const ulb = sb.length / Math.max(1, bL.length);
  const diff = (ula * ulb) / (ISUB_WINKLER + (1 - ISUB_WINKLER) * (ula + ulb - ula * ulb));
  return Math.max(0, Math.min(1, comm - diff));
}
