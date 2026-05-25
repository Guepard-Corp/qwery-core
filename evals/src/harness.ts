import { createDuckDBCompute } from '@qwery/adapter-compute-duckdb';
import { runAgent } from '@qwery/agent-factory-sdk';
import type { Logger, ToolEvent } from '@qwery/domain';
import type { EvalModel } from './llm';
import type { RunOutcome, Scenario } from './types';

const silentLogger: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

/**
 * Runs a scenario once against the real model: a fresh DuckDB, the fixture
 * loaded, the agent driven headless via `runAgent`, the tool trace captured.
 * No TUI — this is the same orchestration the app uses, minus the renderer.
 */
export async function runScenarioOnce(scenario: Scenario, model: EvalModel): Promise<RunOutcome> {
  const compute = createDuckDBCompute();
  await scenario.setup(compute);

  const trace: ToolEvent[] = [];
  const result = await runAgent({
    messages: [{ role: 'user', content: scenario.prompt }],
    compute,
    llm: model.provider,
    logger: silentLogger,
    onToolEvent: (event) => trace.push(event),
    onToken: () => undefined,
    datasources: scenario.datasources,
    schemaProvider: { listSchemas: async () => scenario.schemas },
    disableCompaction: true,
  });

  return { text: result.text, finishReason: result.finishReason, trace, compute };
}
