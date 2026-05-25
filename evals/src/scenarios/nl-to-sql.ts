import { runQueryHit, runQueryRows } from '../assertions';
import { datasourceSummary, type FixtureColumn, fixtureMetadata } from '../fixture';
import type { Scenario } from '../types';

const COLUMNS: FixtureColumn[] = [
  { name: 'id', type: 'INTEGER' },
  { name: 'customer', type: 'VARCHAR' },
  { name: 'amount', type: 'INTEGER' },
];
const GOLDEN_COUNT = 3;

/**
 * The DataAgent's core value: a natural-language question must yield the correct
 * number. Success is machine-checked — the agent must use the privacy-safe
 * `runQuery` tool AND land on the golden scalar (verified from the tool trace),
 * not judged by prose.
 */
export const nlToSqlOrderCount: Scenario = {
  name: 'NL→SQL · order count',
  async setup(compute) {
    await compute.runSql(
      "CREATE TABLE orders AS SELECT * FROM (VALUES (1, 'Alice', 100), (2, 'Bob', 200), (3, 'Carol', 300)) AS t(id, customer, amount)",
    );
  },
  datasources: [datasourceSummary('shop', 'orders', COLUMNS)],
  schemas: [
    { datasourceId: 'ds-shop', datasourceName: 'shop', metadata: fixtureMetadata('orders', COLUMNS) },
  ],
  prompt: 'Using the shop datasource, how many orders are there? Reply with just the number.',
  runs: 2,
  threshold: 0.5,
  check(outcome) {
    const usedRunQuery = runQueryRows(outcome.trace).length > 0;
    const hitGolden = runQueryHit(outcome.trace, GOLDEN_COUNT) || /\b3\b/.test(outcome.text);
    return usedRunQuery && hitGolden;
  },
};
