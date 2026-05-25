/**
 * Privacy invariant harness (ADR #28, #31).
 *
 * Asserts that the LLM never receives row-level values from the test dataset.
 * Strategy:
 *   1. Read all values from `data/sales.csv` — this is our "must not leak" set.
 *   2. Run a series of representative agent prompts.
 *   3. Capture every payload the AI SDK would send upstream (system prompt,
 *      messages, tool results) via a recording wrapper around the model.
 *   4. Assert: for every value in the dataset, NO substring match in any payload.
 *
 * NOTE — MVP scaffold. The full implementation requires wiring a recording
 * provider into the agent loop. Today it shells the privacy check via static
 * inspection: parses tools.ts to verify that `runQuery` validates aggregate-only
 * and that `present` only returns `{ ok, rowCount }` to the LLM. The behavioural
 * test follows post-restructure when adapter ports are isolatable.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface Finding {
  rule: string;
  message: string;
}

const root = resolve(import.meta.dir, '..');
const findings: Finding[] = [];

function loadSource(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8');
}

// --- Static check 1: runQuery uses the aggregate validator
const tools = loadSource('packages/agent-factory-sdk/src/tools.ts');
if (!/validateAggregateOnly\s*\(\s*sql\s*\)/.test(tools)) {
  findings.push({
    rule: 'runQuery.aggregate-validator',
    message: '`runQuery` must call validateAggregateOnly(sql) before executing.',
  });
}
if (!/result\.rowCount\s*!==\s*1/.test(tools)) {
  findings.push({
    rule: 'runQuery.single-row',
    message: '`runQuery` must reject results with rowCount !== 1.',
  });
}

// --- Static check 2: present returns only { ok, rowCount } to the LLM, never rows.
const presentBlock = tools.match(/present:\s*tool\(\{[\s\S]*?execute:[\s\S]*?\}\),/);
if (!presentBlock) {
  findings.push({
    rule: 'present.shape',
    message: '`present` tool block could not be located in packages/agent-factory-sdk/src/tools.ts.',
  });
} else {
  const text = presentBlock[0];
  const llmReturn = text.match(/llm:\s*\{([^}]*)\}/);
  if (!llmReturn) {
    findings.push({
      rule: 'present.llm-shape',
      message: '`present` must declare its llm-facing return shape inline.',
    });
  } else {
    const shape = llmReturn[1] ?? '';
    if (/rows/.test(shape) || /row:\s/.test(shape) || /result:\s/.test(shape)) {
      findings.push({
        rule: 'present.no-row-leak',
        message:
          '`present` LLM return shape must not include rows/row/result. Found suspicious key in: ' +
          shape.trim(),
      });
    }
  }
}

// --- Static check 3: describeQuery uses PREPARE, not actual execution
const adapter = loadSource('packages/adapters/compute-duckdb/src/index.ts');
if (!/describeSql[\s\S]*?prepare\(/.test(adapter)) {
  findings.push({
    rule: 'describeQuery.prepare-only',
    message: 'describeSql must use prepare() (no data exposed). Found something else.',
  });
}

// --- Static check 4: telemetry redaction layer reads no personal-data fields.
// All TUI telemetry routes through `telemetry-actions.ts`. If that module never
// reads the content-bearing fields of a tool result/input, it cannot forward
// them — so analytics/traces stay free of statements, rows, locations, shell
// input, rendered output and error wording. Word boundaries keep safe lookalikes
// (rowCount, taskStatus) from tripping the check.
const telemetryActions = loadSource('apps/cli/src/infra/telemetry-actions.ts');
const FORBIDDEN_FIELD_ACCESS: Array<{ pattern: RegExp; field: string }> = [
  { pattern: /\.sql\b/, field: 'sql' },
  { pattern: /\.rows\b/, field: 'rows' },
  { pattern: /\.row\b/, field: 'row' },
  { pattern: /\.stdout\b/, field: 'stdout' },
  { pattern: /\.stderr\b/, field: 'stderr' },
  { pattern: /\.command\b/, field: 'command' },
  { pattern: /\.diff\b/, field: 'diff' },
  { pattern: /\.rendered\b/, field: 'rendered' },
  { pattern: /\.preview\b/, field: 'preview' },
  { pattern: /\.query\b/, field: 'query' },
  { pattern: /\.task\b/, field: 'task' },
  { pattern: /\.message\b/, field: 'message' },
  { pattern: /\.path\b/, field: 'path' },
  { pattern: /\.text\b/, field: 'text' },
];
for (const { pattern, field } of FORBIDDEN_FIELD_ACCESS) {
  if (pattern.test(telemetryActions)) {
    findings.push({
      rule: 'telemetry.no-pii-field',
      message: `telemetry-actions.ts must not read \`.${field}\` (personal data must never reach telemetry).`,
    });
  }
}

if (findings.length === 0) {
  console.log('✓ Privacy invariants hold.');
  process.exit(0);
}

console.error('✗ Privacy invariants violated:');
for (const f of findings) console.error(`  [${f.rule}] ${f.message}`);
process.exit(1);
