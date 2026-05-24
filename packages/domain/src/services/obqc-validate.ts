import type { OBQCRule, OBQCRuleType } from '../ports/semantic';

/**
 * Pre-execution SQL validation — OBQC §3 Phase 1, "incorrect property".
 *
 * A pure domain service (sibling of `validateAggregateOnly`): given generated
 * SQL and the OBQC constraint snapshot, flag *qualified* references (`x.name`)
 * whose name is absent from the schema vocabulary — i.e. a hallucinated column
 * or table. Scope is deliberately conservative: this is the one rule type
 * reliably detectable from SQL text without a parser/SPARQL engine. Domain/range
 * and join-path rules need real BGP analysis and are out of scope.
 *
 * Fail-open: with no constraint rules (ontology disabled/empty) nothing is
 * validated and the query passes — never block on a missing ontology.
 */

export interface QueryValidationViolation {
  ruleType: Extract<OBQCRuleType, 'incorrect_property'>;
  /** The offending identifier as written in the SQL. */
  entity: string;
  /** Paper-style natural-language explanation fed to the repair prompt. */
  explanation: string;
}

export interface QueryValidationResult {
  valid: boolean;
  violations: QueryValidationViolation[];
  /** Present only when invalid: the OBQC repair instruction for the LLM. */
  repairPrompt?: string;
}

/** Strips single-quoted string literals (handles '' escapes) so their contents aren't scanned. */
const STRING_LITERAL_RE = /'(?:[^']|'')*'/g;

/** Matches a qualified reference `qualifier.name` (or `qualifier.*`). */
const QUALIFIED_REF_RE = /[a-z_]\w*\.([a-z_]\w*|\*)/gi;

function buildVocabulary(rules: OBQCRule[]): Set<string> {
  const vocab = new Set<string>();
  for (const rule of rules) {
    vocab.add(rule.subjectTable.toLowerCase());
    if (rule.subjectColumn) {
      vocab.add(rule.subjectColumn.toLowerCase());
    }
    if (rule.objectTable) {
      vocab.add(rule.objectTable.toLowerCase());
    }
    if (rule.objectColumn) {
      vocab.add(rule.objectColumn.toLowerCase());
    }
  }
  return vocab;
}

export function validateQuery(sql: string, rules: OBQCRule[]): QueryValidationResult {
  if (rules.length === 0) {
    return { valid: true, violations: [] };
  }

  const vocabulary = buildVocabulary(rules);
  const cleaned = sql.replace(STRING_LITERAL_RE, "''");

  const seen = new Set<string>();
  const violations: QueryValidationViolation[] = [];
  for (const match of cleaned.matchAll(QUALIFIED_REF_RE)) {
    const ref = match[1];
    if (ref === '*') {
      continue;
    }
    const key = ref.toLowerCase();
    if (vocabulary.has(key) || seen.has(key)) {
      continue;
    }
    seen.add(key);
    violations.push({
      ruleType: 'incorrect_property',
      entity: ref,
      explanation: `"${ref}" is not defined in the schema. Use only columns and tables that exist in the provided schema.`,
    });
  }

  if (violations.length === 0) {
    return { valid: true, violations: [] };
  }

  const issues = violations.map((v) => v.explanation).join(' ');
  return {
    valid: false,
    violations,
    repairPrompt: `We have a query ${sql} with some issues outlined here: ${issues} Please re-write it.`,
  };
}
