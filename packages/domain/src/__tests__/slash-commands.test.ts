import { describe, expect, test } from 'bun:test';
import { matchCommands, SLASH_COMMANDS } from '../slash-commands';

describe('SLASH_COMMANDS', () => {
  test('every entry has unique name + label starting with /', () => {
    const names = new Set<string>();
    for (const c of SLASH_COMMANDS) {
      expect(c.label.startsWith('/')).toBe(true);
      expect(names.has(c.name)).toBe(false);
      names.add(c.name);
    }
  });
});

describe('matchCommands', () => {
  test('returns [] when buffer does not start with /', () => {
    expect(matchCommands('hello')).toEqual([]);
  });

  test('returns the full list when buffer is "/"', () => {
    expect(matchCommands('/')).toEqual(SLASH_COMMANDS);
  });

  test('filters by prefix (case-insensitive)', () => {
    const r = matchCommands('/Data');
    expect(r.map((c) => c.name)).toEqual(['datasources', 'data']);
  });

  test('returns a single match for an unambiguous prefix', () => {
    const r = matchCommands('/agents');
    expect(r).toHaveLength(1);
    expect(r[0]?.name).toBe('agents');
  });

  test('returns [] for an unknown prefix', () => {
    expect(matchCommands('/nope')).toEqual([]);
  });

  test('matches /update unambiguously', () => {
    const r = matchCommands('/up');
    expect(r.map((c) => c.name)).toEqual(['update']);
  });
});
