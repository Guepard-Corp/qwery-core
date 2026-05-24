import { describe, expect, test } from 'bun:test';
import type { Branching } from '@qwery/domain';
import { guardedWrite } from '../branching';

interface FakeOptions {
  available?: boolean;
  commit?: (message: string) => Promise<string>;
}

function fakeBranching(opts: FakeOptions = {}): { branching: Branching; commitCalls: string[] } {
  const commitCalls: string[] = [];
  const unused = () => Promise.reject(new Error('not used in this test'));
  const branching: Branching = {
    isAvailable: async () => opts.available ?? true,
    version: async () => '0.0.0',
    status: unused as Branching['status'],
    init: unused as Branching['init'],
    importData: unused as Branching['importData'],
    commit: async (message: string) => {
      commitCalls.push(message);
      return opts.commit ? opts.commit(message) : 'commit-abc';
    },
    branch: unused as Branching['branch'],
    checkout: unused as Branching['checkout'],
    listBranches: unused as Branching['listBranches'],
    diff: unused as Branching['diff'],
  };
  return { branching, commitCalls };
}

describe('guardedWrite', () => {
  test('non-destructive SQL is allowed without snapshot', async () => {
    const { branching, commitCalls } = fakeBranching();
    const decision = await guardedWrite({ branching }, { sql: 'SELECT 1', branchable: true });
    expect(decision.status).toBe('allowed');
    if (decision.status === 'allowed') expect(decision.recoveryRef).toBeUndefined();
    expect(commitCalls).toHaveLength(0);
  });

  test('destructive + branchable + GFS available → auto-snapshot, allowed with recoveryRef', async () => {
    const { branching, commitCalls } = fakeBranching({ available: true });
    const decision = await guardedWrite({ branching }, { sql: 'DROP TABLE users', branchable: true });
    expect(decision.status).toBe('allowed');
    if (decision.status === 'allowed') {
      expect(decision.recoveryRef).toBe('commit-abc');
      expect(decision.reasons.length).toBeGreaterThan(0);
    }
    expect(commitCalls).toHaveLength(1);
    expect(commitCalls[0]).toContain('auto: before');
  });

  test('destructive + branchable + GFS unavailable → confirmation required', async () => {
    const { branching, commitCalls } = fakeBranching({ available: false });
    const decision = await guardedWrite({ branching }, { sql: 'DELETE FROM users', branchable: true });
    expect(decision.status).toBe('confirmation_required');
    expect(commitCalls).toHaveLength(0);
  });

  test('destructive + branchable + snapshot fails → confirmation required', async () => {
    const { branching } = fakeBranching({
      available: true,
      commit: () => Promise.reject(new Error('gfs down')),
    });
    const decision = await guardedWrite({ branching }, { sql: 'TRUNCATE t', branchable: true });
    expect(decision.status).toBe('confirmation_required');
    expect(decision.reasons).toContain('GFS snapshot failed');
  });

  test('destructive + non-branchable + unconfirmed → confirmation required', async () => {
    const { branching, commitCalls } = fakeBranching();
    const decision = await guardedWrite({ branching }, { sql: 'DROP TABLE t', branchable: false });
    expect(decision.status).toBe('confirmation_required');
    expect(commitCalls).toHaveLength(0);
  });

  test('destructive + non-branchable + confirmed → allowed without recoveryRef', async () => {
    const { branching, commitCalls } = fakeBranching();
    const decision = await guardedWrite(
      { branching },
      { sql: 'DROP TABLE t', branchable: false, confirmed: true },
    );
    expect(decision.status).toBe('allowed');
    if (decision.status === 'allowed') expect(decision.recoveryRef).toBeUndefined();
    expect(commitCalls).toHaveLength(0);
  });
});
