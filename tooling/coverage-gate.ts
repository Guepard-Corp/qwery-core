#!/usr/bin/env bun
/**
 * Enforces the per-layer coverage thresholds of ADR #16 against `coverage/lcov.info`.
 *
 * bun's native `coverageThreshold` is a single global number; the hexagonal
 * layers deserve different bars, so we parse lcov and aggregate per path prefix.
 *
 * Limitation: lcov only lists files imported by the tests that ran, so a source
 * file never imported anywhere is invisible here (not counted as 0). Run the
 * full suite (`bun test --coverage`) before gating. Files present-but-uncovered
 * ARE counted.
 */
import { resolve } from 'node:path';

interface Tier {
  /** Path prefix (relative to repo root) identifying the layer. */
  prefix: string;
  label: string;
  /** Minimum line coverage %, per ADR #16. */
  minLines: number;
}

// Order matters: the first matching prefix wins (most specific first).
const TIERS: Tier[] = [
  { prefix: 'packages/domain/', label: 'domain', minLines: 100 },
  { prefix: 'packages/application/', label: 'application', minLines: 90 },
  { prefix: 'packages/extension-sdk/', label: 'extension-sdk', minLines: 80 },
  { prefix: 'packages/adapters/', label: 'adapters', minLines: 70 },
  { prefix: 'packages/extensions/', label: 'extensions', minLines: 80 },
  { prefix: 'apps/cli/', label: 'apps/cli', minLines: 50 },
];

interface FileTotals {
  lf: number;
  lh: number;
}

function parseLcov(text: string): Map<string, FileTotals> {
  const perFile = new Map<string, FileTotals>();
  let current: FileTotals | null = null;
  for (const line of text.split('\n')) {
    if (line.startsWith('SF:')) {
      current = { lf: 0, lh: 0 };
      perFile.set(line.slice(3).trim(), current);
    } else if (current && line.startsWith('LF:')) {
      current.lf = Number(line.slice(3));
    } else if (current && line.startsWith('LH:')) {
      current.lh = Number(line.slice(3));
    } else if (line === 'end_of_record') {
      current = null;
    }
  }
  return perFile;
}

function tierFor(file: string): Tier | undefined {
  return TIERS.find((t) => file.startsWith(t.prefix));
}

async function main() {
  const lcovPath = resolve(process.cwd(), 'coverage/lcov.info');
  const file = Bun.file(lcovPath);
  if (!(await file.exists())) {
    console.error(`coverage-gate: ${lcovPath} not found. Run \`bun test --coverage\` first.`);
    process.exit(1);
  }

  const perFile = parseLcov(await file.text());
  // Aggregate per tier (each file belongs to at most one tier via its prefix).
  // `process.stdout.write` rather than `console.log` keeps the report off biome's
  // noConsole rule (only `console.error` is allowed); the report is plain output.
  const out = (line: string) => process.stdout.write(`${line}\n`);

  let failed = false;
  out('\nCoverage gate (ADR #16) — line coverage per layer:\n');
  for (const tier of TIERS) {
    let lf = 0;
    let lh = 0;
    let files = 0;
    for (const [path, totals] of perFile) {
      if (tierFor(path)?.label !== tier.label) continue;
      lf += totals.lf;
      lh += totals.lh;
      files += 1;
    }
    if (files === 0) {
      out(`  ${tier.label.padEnd(16)} —      (no covered files reported)`);
      continue;
    }
    const pct = (lh / lf) * 100;
    const ok = pct >= tier.minLines;
    if (!ok) failed = true;
    out(
      `  ${ok ? '✓' : '✗'} ${tier.label.padEnd(16)} ${pct.toFixed(2).padStart(6)}%  (min ${tier.minLines}%, ${files} files)`,
    );
  }

  if (failed) {
    console.error('\ncoverage-gate: a layer is below its ADR #16 threshold.\n');
    process.exit(1);
  }
  out('\ncoverage-gate: all gated layers meet ADR #16 thresholds.\n');
}

main().catch((err) => {
  console.error('coverage-gate: unexpected error', err);
  process.exit(1);
});
