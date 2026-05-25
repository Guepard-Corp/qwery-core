import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { editFile } from '../edit-tool';

/**
 * `editFile` is workspace-scoped via `resolveSafePath` (it refuses paths
 * outside the cwd / cache root). We create temp files inside the workspace
 * (`./tmp-edit-tests/...`) to exercise it under realistic conditions.
 */

const fixtureDir = join(process.cwd(), '.test-edit-fixtures');

function fixture(name: string): string {
  return join(fixtureDir, name);
}

function setup(name: string, content: string): string {
  if (!existsSync(fixtureDir)) {
    mkdtempSync(join(tmpdir(), 'edit-tests-'));
    // Use a stable dir inside cwd to satisfy resolveSafePath.
    require('node:fs').mkdirSync(fixtureDir, { recursive: true });
  }
  const path = fixture(name);
  writeFileSync(path, content, 'utf-8');
  return path;
}

afterAll(() => {
  if (existsSync(fixtureDir)) {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});

beforeEach(() => {
  if (existsSync(fixtureDir)) {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
  require('node:fs').mkdirSync(fixtureDir, { recursive: true });
});

describe('editFile — happy path', () => {
  test('single exact replacement', async () => {
    const p = setup('a.txt', 'hello world\n');
    const result = await editFile(p, [{ oldText: 'world', newText: 'there' }]);
    expect(result.appliedEdits).toBe(1);
    expect(readFileSync(p, 'utf-8')).toBe('hello there\n');
  });

  test('multiple non-overlapping replacements in one call', async () => {
    const p = setup('b.txt', 'one two three four\n');
    const result = await editFile(p, [
      { oldText: 'one', newText: '1' },
      { oldText: 'four', newText: '4' },
    ]);
    expect(result.appliedEdits).toBe(2);
    expect(readFileSync(p, 'utf-8')).toBe('1 two three 4\n');
  });

  test('preserves CRLF line endings', async () => {
    const p = setup('crlf.txt', 'a\r\nb\r\nc\r\n');
    await editFile(p, [{ oldText: 'b', newText: 'B' }]);
    expect(readFileSync(p, 'utf-8')).toBe('a\r\nB\r\nc\r\n');
  });

  test('reports diff text on success', async () => {
    const p = setup('diff.txt', 'foo\nbar\nbaz\n');
    const r = await editFile(p, [{ oldText: 'bar', newText: 'BAR' }]);
    expect(r.diff).toContain('bar');
    expect(r.diff).toContain('BAR');
  });
});

describe('editFile — fuzzy matching', () => {
  test('smart quotes in oldText still match plain quotes in file', async () => {
    const p = setup('quotes.txt', "it's a test\n");
    const r = await editFile(p, [{ oldText: 'it’s a test', newText: 'pass' }]);
    expect(r.appliedEdits).toBe(1);
    expect(readFileSync(p, 'utf-8')).toBe('pass\n');
  });

  test('em-dash vs hyphen difference is bridged', async () => {
    const p = setup('dash.txt', 'a - b\n');
    const r = await editFile(p, [{ oldText: 'a — b', newText: 'merged' }]);
    expect(r.appliedEdits).toBe(1);
  });

  test('non-breaking space vs regular space is bridged', async () => {
    const p = setup('nbsp.txt', 'one two three\n');
    const r = await editFile(p, [{ oldText: 'one two three', newText: 'X' }]);
    expect(r.appliedEdits).toBe(1);
  });
});

describe('editFile — atomicity & errors', () => {
  test('rejects when oldText is not unique', async () => {
    const p = setup('dup.txt', 'foo bar foo\n');
    await expect(editFile(p, [{ oldText: 'foo', newText: 'X' }])).rejects.toThrow(/unique/);
    // File untouched.
    expect(readFileSync(p, 'utf-8')).toBe('foo bar foo\n');
  });

  test('rejects when oldText is missing', async () => {
    const p = setup('missing.txt', 'hello\n');
    await expect(editFile(p, [{ oldText: 'goodbye', newText: 'X' }])).rejects.toThrow(/not found/);
    expect(readFileSync(p, 'utf-8')).toBe('hello\n');
  });

  test('all edits or nothing — second edit fails => first not applied', async () => {
    const p = setup('atomic.txt', 'a b c\n');
    await expect(
      editFile(p, [
        { oldText: 'a', newText: 'A' },
        { oldText: 'NOPE', newText: 'X' },
      ]),
    ).rejects.toThrow();
    expect(readFileSync(p, 'utf-8')).toBe('a b c\n');
  });

  test('rejects empty edits array', async () => {
    const p = setup('empty.txt', 'x\n');
    await expect(editFile(p, [])).rejects.toThrow(/at least one/);
  });

  test('rejects when the file does not exist', async () => {
    await expect(editFile(fixture('does-not-exist.txt'), [{ oldText: 'a', newText: 'b' }])).rejects.toThrow(
      /does not exist/,
    );
  });

  test('refuses paths outside the workspace root', async () => {
    await expect(editFile('/etc/passwd', [{ oldText: 'root', newText: 'X' }])).rejects.toThrow();
  });
});

describe('editFile — concurrency lock', () => {
  test('serialised edits on the same path remain coherent', async () => {
    const p = setup('lock.txt', 'ABC\n');
    // Two concurrent edits on the same file. With the per-path lock, the
    // second one sees the result of the first.
    const a = editFile(p, [{ oldText: 'A', newText: 'X' }]);
    const b = editFile(p, [{ oldText: 'XBC', newText: 'YBC' }]);
    await Promise.all([a, b]);
    expect(readFileSync(p, 'utf-8')).toBe('YBC\n');
  });
});
