import { describe, expect, test } from 'bun:test';
import type { Compute, LLMProvider, Logger, QueryResult, QuerySchema } from '@qwery/domain';
import type { AgentRunOptions, AgentRunResult, SubagentRunEvent, SubagentRunInfo } from '../agent-types';
import { createBackgroundJobRegistry } from '../background-jobs';
import { buildAgentTool, buildTaskStatusTool } from '../subagent';

interface ToolExecHandle {
  execute?: (input: unknown, ctx?: unknown) => Promise<unknown>;
}

async function exec(tool: ToolExecHandle, input: unknown) {
  return tool.execute?.(input, { toolCallId: 't', messages: [] });
}

function silentLogger(): Logger {
  return {
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  } as unknown as Logger;
}

function fakeCompute(): Compute {
  return {
    runSql: async () => ({ columns: [], rows: [], rowCount: 0 }) as unknown as QueryResult,
    describeSql: async () => ({ columns: [] }) as unknown as QuerySchema,
  };
}

const llm = {} as LLMProvider;

const SUBAGENT: SubagentRunInfo = {
  name: 'sql-optimizer',
  description: 'Optimises SQL',
  baseAgent: 'data',
  prompt: 'You are an expert at rewriting SQL.',
  path: '<inline>',
};

function buildResult(text: string): AgentRunResult {
  return {
    text,
    usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    durationMs: 10,
    finishReason: 'stop',
  };
}

describe('buildAgentTool — persisted subagent', () => {
  test('runs the persisted subagent and returns text + usage', async () => {
    let received: AgentRunOptions | undefined;
    const events: SubagentRunEvent[] = [];
    const tool = buildAgentTool(
      [SUBAGENT],
      {
        runAgent: async (opts) => {
          received = opts;
          return buildResult('optimized SQL');
        },
        compute: fakeCompute(),
        llm,
        logger: silentLogger(),
      },
      (e) => events.push(e),
    );
    const r = (await exec(tool, {
      name: 'sql-optimizer',
      task: 'rewrite SELECT * to a projection',
    })) as { ok: boolean; text: string; name: string };
    expect(r.ok).toBe(true);
    expect(r.text).toBe('optimized SQL');
    expect(r.name).toBe('sql-optimizer');
    expect(received?.isSubagent).toBe(true);
    expect(received?.agent?.label).toContain('sql-optimizer');
    // Lifecycle events emitted.
    expect(events.find((e) => e.kind === 'start')).toBeTruthy();
    expect(events.find((e) => e.kind === 'finish')).toBeTruthy();
  });

  test('returns an error when the named subagent does not exist', async () => {
    const tool = buildAgentTool([SUBAGENT], {
      runAgent: async () => buildResult(''),
      compute: fakeCompute(),
      llm,
      logger: silentLogger(),
    });
    const r = (await exec(tool, { name: 'nope', task: 'x' })) as { ok: boolean; error: string };
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Unknown subagent/);
  });
});

describe('buildAgentTool — ad-hoc subagent', () => {
  test('synthesizes a subagent from prompt + baseAgent + tools whitelist', async () => {
    let received: AgentRunOptions | undefined;
    const tool = buildAgentTool([], {
      runAgent: async (opts) => {
        received = opts;
        return buildResult('done');
      },
      compute: fakeCompute(),
      llm,
      logger: silentLogger(),
    });
    const r = (await exec(tool, {
      prompt: 'You are a code reviewer.',
      baseAgent: 'code',
      tools: ['read', 'edit'],
      task: 'review packages/x',
    })) as { ok: boolean };
    expect(r.ok).toBe(true);
    // base = code → tools come from CodingAgentSpec, filtered to whitelist
    expect(received?.agent?.tools).toEqual(['read', 'edit']);
  });

  test('errors when neither name nor prompt is provided', async () => {
    const tool = buildAgentTool([], {
      runAgent: async () => buildResult(''),
      compute: fakeCompute(),
      llm,
      logger: silentLogger(),
    });
    const r = (await exec(tool, { task: 'x' })) as { ok: boolean; error: string };
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/either/);
  });

  test('runAgent throw is surfaced as { ok:false, error }', async () => {
    const tool = buildAgentTool([SUBAGENT], {
      runAgent: async () => {
        throw new Error('llm down');
      },
      compute: fakeCompute(),
      llm,
      logger: silentLogger(),
    });
    const r = (await exec(tool, { name: 'sql-optimizer', task: 'x' })) as {
      ok: boolean;
      error: string;
    };
    expect(r.ok).toBe(false);
    expect(r.error).toBe('llm down');
  });
});

describe('buildAgentTool — background mode', () => {
  test('returns immediately with a task_id and resolves the job asynchronously', async () => {
    const jobs = createBackgroundJobRegistry();
    let resolveRun!: (r: AgentRunResult) => void;
    const runPromise = new Promise<AgentRunResult>((res) => {
      resolveRun = res;
    });
    const tool = buildAgentTool([SUBAGENT], {
      runAgent: () => runPromise,
      compute: fakeCompute(),
      llm,
      logger: silentLogger(),
      backgroundJobs: jobs,
    });
    const launch = (await exec(tool, {
      name: 'sql-optimizer',
      task: 'x',
      background: true,
    })) as { ok: boolean; task_id: string; state: string };
    expect(launch.ok).toBe(true);
    expect(launch.state).toBe('running');
    const job = jobs.get(launch.task_id);
    expect(job?.state).toBe('running');
    // Now resolve the in-flight runAgent and check that the registry transitions.
    resolveRun(buildResult('result'));
    // Allow the .then() callback to settle.
    await new Promise((r) => setTimeout(r, 0));
    const after = jobs.get(launch.task_id);
    expect(after?.state).toBe('completed');
    expect(after?.text).toBe('result');
  });

  test('errors when background:true but no job registry is wired', async () => {
    const tool = buildAgentTool([SUBAGENT], {
      runAgent: async () => buildResult(''),
      compute: fakeCompute(),
      llm,
      logger: silentLogger(),
    });
    const r = (await exec(tool, {
      name: 'sql-optimizer',
      task: 'x',
      background: true,
    })) as { ok: boolean; error: string };
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Background execution not available/);
  });
});

describe('buildTaskStatusTool', () => {
  test('returns terminal state without waiting when wait is false', async () => {
    const jobs = createBackgroundJobRegistry();
    const job = jobs.create({ subagent: 'x', prompt: 'p' });
    jobs.complete(job.id, 'final text');
    const tool = buildTaskStatusTool(jobs);
    const r = (await exec(tool, { task_id: job.id })) as { state: string; text: string };
    expect(r.state).toBe('completed');
    expect(r.text).toBe('final text');
  });

  test('errors for an unknown task_id', async () => {
    const tool = buildTaskStatusTool(createBackgroundJobRegistry());
    const r = (await exec(tool, { task_id: 'nope' })) as { ok: boolean; error: string };
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Unknown task_id/);
  });

  test('with wait:true, blocks until terminal then returns the result', async () => {
    const jobs = createBackgroundJobRegistry();
    const job = jobs.create({ subagent: 'x', prompt: 'p' });
    const tool = buildTaskStatusTool(jobs);
    const pending = exec(tool, { task_id: job.id, wait: true, timeout_ms: 1000 }) as Promise<{
      state: string;
      text?: string;
    }>;
    setTimeout(() => jobs.complete(job.id, 'done'), 50);
    const r = await pending;
    expect(r.state).toBe('completed');
    expect(r.text).toBe('done');
  });
});
