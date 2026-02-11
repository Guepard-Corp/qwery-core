import { readdirSync, writeFileSync, readFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { runRegistry, resetRegistry, type RunResult } from './index';
import { HTML_TEMPLATE } from './report-template';

function findEvalFiles(dir: string): string[] {
  const out: string[] = [];
  const base = resolve(process.cwd(), dir);
  function walk(d: string): void {
    try {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const full = join(d, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name.endsWith('.eval.ts') || e.name.endsWith('.eval.mts'))
          out.push(full);
      }
    } catch {
      // ignore
    }
  }
  walk(base);
  return out;
}

async function main(): Promise<void> {
  const projectCwd = process.env.EVALS_CWD ?? process.argv[2];
  const pathArg = process.env.EVALS_PATH ?? process.argv[3] ?? '__evals__';
  const onlyReport = process.env.ONLY_REPORT === 'true';

  if (projectCwd) process.chdir(projectCwd);

  const allResults: RunResult[] = [];
  let totalFailed = 0;

  if (!onlyReport) {
    const files = findEvalFiles(pathArg);
    if (files.length === 0) {
      console.error(`No eval files found under ${pathArg}`);
      process.exit(1);
    }

    const { getUsageFromCatalog } = await import('@qwery/shared/model-cost');
    type Catalog = import('@qwery/shared/model-cost').ModelsDevCatalog;

    let catalog: Catalog | null = null;
    async function fetchModelsDevCatalog(): Promise<Catalog> {
      if (catalog) return catalog;
      const res = await fetch('https://models.dev/api.json');
      if (!res.ok) throw new Error(`Failed to fetch models catalog: ${res.status}`);
      catalog = (await res.json()) as Catalog;
      return catalog;
    }

    for (const file of files) {
      resetRegistry();
      await import(pathToFileURL(file).href);
      const { results, failed } = await runRegistry();

      const modelsCatalog = await fetchModelsDevCatalog();

      for (const result of results) {
        if (result.model && result.usage) {
          const usage = result.usage as {
            inputTokens?: number;
            outputTokens?: number;
            reasoningTokens?: number;
            cachedInputTokens?: number;
          };
          const { cost, inputTokenCostUSD, outputTokenCostUSD } =
            getUsageFromCatalog(modelsCatalog, result.model, {
              inputTokens: usage.inputTokens ?? 0,
              outputTokens: usage.outputTokens ?? 0,
              reasoningTokens: usage.reasoningTokens ?? 0,
              cachedInputTokens: usage.cachedInputTokens ?? 0,
            });
          result.costs = {
            inputUSD: inputTokenCostUSD,
            outputUSD: outputTokenCostUSD,
            totalUSD: cost,
          };
        }
      }

      allResults.push(...results);
      totalFailed += failed;
    }
  }

  const outputDir = join(process.cwd(), 'evals');
  // ensure directory exists
  try {
    readdirSync(outputDir);
  } catch {
    const { mkdirSync } = await import('node:fs');
    mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  if (!onlyReport) {
    writeFileSync(
      join(outputDir, `eval-results-${timestamp}.json`),
      JSON.stringify(allResults, null, 2),
    );
  }

  // Generate Manifest
  const allFiles = readdirSync(outputDir)
    .filter(
      (f) => f.startsWith('eval-results-') && f.endsWith('.json'),
    )
    .sort()
    .reverse();

  writeFileSync(
    join(outputDir, 'manifest.json'),
    JSON.stringify(allFiles, null, 2),
  );

  // Read and prepare component source files
  const evalsDir = resolve(fileURLToPath(import.meta.url), '../..');
  const componentsDir = join(evalsDir, 'src/report');

  const getSource = (name: string) =>
    readFileSync(join(componentsDir, `${name}.ts`), 'utf-8')
      .replace(/import .* from .*/g, '')
      .replace(/export /g, '');

  const evalResultCardSource = getSource('EvalResultCard');
  const evalInsightsSource = getSource('EvalInsights');
  const evalReportSource = getSource('EvalReport');

  // Write HTML Report with injected components
  const finalHtml = HTML_TEMPLATE.replace(
    '/* EVAL_RESULT_CARD_SOURCE */',
    evalResultCardSource,
  ).replace(
    '/* EVAL_INSIGHTS_SOURCE */',
    evalInsightsSource,
  ).replace('/* EVAL_REPORT_SOURCE */', evalReportSource);

  writeFileSync(join(outputDir, 'index.html'), finalHtml);

  if (totalFailed > 0) process.exit(1);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
