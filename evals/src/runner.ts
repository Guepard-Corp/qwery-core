import { runScenarioOnce } from './harness';
import { evalModel, isReachable } from './llm';
import { scenarios } from './scenarios';
import type { ScenarioReport } from './types';

const out = (line: string) => process.stdout.write(`${line}\n`);

async function main() {
  const model = evalModel();
  out(`\nqwery evals · model: ${model.label}\n`);

  if (!(await isReachable(model.baseURL))) {
    out('model endpoint unreachable — skipping (not a failure).');
    out('  local: `ollama serve` + `ollama pull qwen3-coder:30b`');
    out('  hosted: set QWERY_EVAL_BASE_URL / QWERY_EVAL_MODEL / QWERY_EVAL_API_KEY');
    return;
  }

  const reports: ScenarioReport[] = [];
  for (const scenario of scenarios) {
    let passes = 0;
    for (let i = 0; i < scenario.runs; i++) {
      try {
        const outcome = await runScenarioOnce(scenario, model);
        if (await scenario.check(outcome)) passes += 1;
      } catch (err) {
        console.error(`  run error in "${scenario.name}":`, err instanceof Error ? err.message : err);
      }
    }
    const passRate = passes / scenario.runs;
    reports.push({
      name: scenario.name,
      runs: scenario.runs,
      passes,
      passRate,
      threshold: scenario.threshold,
      passed: passRate >= scenario.threshold,
    });
  }

  out('| scenario | pass-rate | threshold | verdict |');
  out('|---|---|---|---|');
  for (const r of reports) {
    out(
      `| ${r.name} | ${(r.passRate * 100).toFixed(0)}% (${r.passes}/${r.runs}) | ${(r.threshold * 100).toFixed(0)}% | ${r.passed ? '✅' : '❌'} |`,
    );
  }
  out('');

  const failed = reports.filter((r) => !r.passed);
  if (failed.length > 0) {
    console.error(`evals: ${failed.length} scenario(s) below threshold.`);
    process.exit(1);
  }
  out('evals: all scenarios meet their threshold.');
}

main().catch((err) => {
  console.error('evals: fatal', err);
  process.exit(1);
});
