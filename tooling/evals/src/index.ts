type TestFn = () => void | Promise<void>;

interface Test {
  name: string;
  fn: TestFn;
  skip: boolean;
}

interface Suite {
  name: string;
  suites: Suite[];
  tests: Test[];
}

const root: Suite = { name: 'root', suites: [], tests: [] };
const stack: Suite[] = [root];

function currentSuite(): Suite {
  return stack[stack.length - 1]!;
}

export function describe(name: string, fn: () => void): void {
  const suite: Suite = { name, suites: [], tests: [] };
  currentSuite().suites.push(suite);
  stack.push(suite);
  fn();
  stack.pop();
}

function itImpl(name: string, fn: TestFn, skip: boolean): void {
  currentSuite().tests.push({ name, fn, skip });
}

export const it = Object.assign(
  (name: string, fn: TestFn) => itImpl(name, fn, false),
  {
    skipIf: (cond: boolean) => (name: string, fn: TestFn) =>
      itImpl(name, fn, cond),
  },
);

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null)
    return false;
  const keysA = Object.keys(a as object).sort();
  const keysB = Object.keys(b as object).sort();
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i++) {
    if (keysA[i] !== keysB[i]) return false;
    const k = keysA[i]!;
    if (!deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
      return false;
  }
  return true;
}

export class AssertionError extends Error {
  constructor(
    message: string,
    public expected: unknown,
    public received: unknown,
  ) {
    super(message);
    this.name = 'AssertionError';
  }
}

export function expect<T>(actual: T) {
  return {
    toBe(expected: T): void {
      if (!Object.is(actual, expected)) {
        throw new AssertionError(
          `Expected ${String(actual)} to be ${String(expected)}`,
          expected,
          actual,
        );
      }
    },
    toEqual(expected: T): void {
      if (!deepEqual(actual, expected)) {
        throw new AssertionError(
          `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`,
          expected,
          actual,
        );
      }
    },
    toBeGreaterThan(expected: number): void {
      if (typeof actual !== 'number' || actual <= expected) {
        throw new AssertionError(
          `Expected ${String(actual)} to be greater than ${expected}`,
          expected,
          actual,
        );
      }
    },
    toBeGreaterThanOrEqual(expected: number): void {
      if (typeof actual !== 'number' || actual < expected) {
        throw new AssertionError(
          `Expected ${String(actual)} to be greater than or equal to ${expected}`,
          expected,
          actual,
        );
      }
    },
    toContain(expected: string): void {
      if (typeof actual !== 'string' || !actual.includes(expected)) {
        throw new AssertionError(
          `Expected ${String(actual)} to contain "${expected}"`,
          expected,
          actual,
        );
      }
    },
  };
}

export interface ObjectEval<T = unknown> {
  prompt: string;
  response: T;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface EvalResult<T> {
  result: T;
  usage?: TokenUsage;
}

export async function runEval<T>(options: {
  agent: Promise<T | EvalResult<T>> | (() => Promise<T | EvalResult<T>>);
  model?: string;
  eval?: ObjectEval<T>;
}): Promise<T> {
  if (currentTestContext) {
    if (options.eval) {
      currentTestContext.objectEval = {
        ...options.eval,
      };
    }
    if (options.model) {
      currentTestContext.model = options.model;
    }
  }

  const agent = options.agent;
  const agentOutput = await (typeof agent === 'function' ? agent() : agent);

  // Check if output is EvalResult
  const isEvalResult = (output: any): output is EvalResult<T> => {
    return (
      typeof output === 'object' &&
      output !== null &&
      'result' in output &&
      ('usage' in output || Object.keys(output).length === 1)
    );
  };

  let result: T;
  let usage: TokenUsage | undefined;

  if (isEvalResult(agentOutput)) {
    result = agentOutput.result;
    usage = agentOutput.usage;
  } else {
    result = agentOutput as T;
  }

  if (currentTestContext) {
    if (options.eval && currentTestContext.objectEval) {
      currentTestContext.objectEval.actual = result;
    }
    if (usage) {
      currentTestContext.usage = usage;
    }
  }
  return result;
}

export interface RunResult {
  suite: string;
  name: string;
  skipped: boolean;
  passed: boolean;
  error?: string;
  durationMs: number;
  expected?: unknown;
  received?: unknown;
  objectEval?: ObjectEval<unknown> & { actual?: unknown };
  model?: string;
  usage?: TokenUsage;
  costs?: {
    inputUSD: number;
    outputUSD: number;
    totalUSD: number;
  };
}

let currentTestContext: {
  objectEval?: ObjectEval<unknown> & { actual?: unknown };
  model?: string;
  usage?: TokenUsage;
} | null = null;

async function runTest(test: Test, suitePath: string): Promise<RunResult> {
  const start = Date.now();
  if (test.skip) {
    return {
      suite: suitePath,
      name: test.name,
      skipped: true,
      passed: true,
      durationMs: 0,
    };
  }
  currentTestContext = {};
  try {
    await test.fn();
    return {
      suite: suitePath,
      name: test.name,
      skipped: false,
      passed: true,
      durationMs: Date.now() - start,
      objectEval: currentTestContext.objectEval,
      model: currentTestContext.model,
      usage: currentTestContext.usage,
    };
  } catch (err) {
    const result: RunResult = {
      suite: suitePath,
      name: test.name,
      skipped: false,
      passed: false,
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
      objectEval: currentTestContext.objectEval,
      model: currentTestContext.model,
      usage: currentTestContext.usage,
    };
    if (err instanceof AssertionError) {
      result.expected = err.expected;
      result.received = err.received;
    }
    return result;
  } finally {
    currentTestContext = null;
  }
}

async function runSuite(suite: Suite, path: string): Promise<RunResult[]> {
  const results: RunResult[] = [];
  const suitePath = path ? `${path} > ${suite.name}` : suite.name;
  for (const test of suite.tests) {
    results.push(await runTest(test, suitePath));
  }
  for (const child of suite.suites) {
    results.push(...(await runSuite(child, suitePath)));
  }
  return results;
}

export async function runRegistry(): Promise<{
  results: RunResult[];
  passed: number;
  failed: number;
  skipped: number;
}> {
  const results = await runSuite(root, '');
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  for (const r of results) {
    if (r.skipped) skipped++;
    else if (r.passed) passed++;
    else failed++;
  }
  for (const r of results) {
    if (r.skipped) {
      console.log(` ↓ ${r.suite} > ${r.name} (skipped)`);
    } else if (r.passed) {
      console.log(` ✓ ${r.suite} > ${r.name} ${r.durationMs}ms`);
    } else {
      console.error(` × ${r.suite} > ${r.name}`);
      if (r.error) console.error(`   ${r.error}`);
    }
  }
  console.log(
    `\n Test Files  ${results.length > 0 ? '1' : '0'} | ${passed} passed | ${skipped} skipped | ${failed} failed`,
  );
  return { results, passed, failed, skipped };
}

export function getRegistry(): Suite {
  return root;
}

export function resetRegistry(): void {
  root.suites.length = 0;
  root.tests.length = 0;
  stack.length = 1;
  stack[0] = root;
}
