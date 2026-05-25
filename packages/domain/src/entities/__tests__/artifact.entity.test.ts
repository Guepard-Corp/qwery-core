import { describe, expect, test } from 'bun:test';
import {
  ArtifactSchema,
  ArtifactType,
  createQueryArtifact,
  recordQueryRun,
  updateQueryArtifact,
} from '../artifact.entity';

describe('createQueryArtifact', () => {
  test('sets type=query, defaults description/tags/datasourceIds', () => {
    const a = createQueryArtifact({ title: 'Top customers', sql: 'SELECT COUNT(*) FROM t' });
    expect(a.type).toBe(ArtifactType.QUERY);
    expect(a.title).toBe('Top customers');
    expect(a.sql).toBe('SELECT COUNT(*) FROM t');
    expect(a.description).toBe('');
    expect(a.tags).toEqual([]);
    expect(a.datasourceIds).toEqual([]);
    expect(a.lastResultMeta).toBeUndefined();
    expect(a.id).toMatch(/^[0-9a-f-]{36}$/i);
  });

  test('preserves tags and datasourceIds when provided', () => {
    const a = createQueryArtifact({
      title: 't',
      sql: 'SELECT 1',
      tags: ['retention', 'monthly'],
      datasourceIds: ['ds_1'],
    });
    expect(a.tags).toEqual(['retention', 'monthly']);
    expect(a.datasourceIds).toEqual(['ds_1']);
  });

  test('rejects empty title', () => {
    expect(() => createQueryArtifact({ title: '', sql: 'SELECT 1' })).toThrow();
  });

  test('rejects empty sql', () => {
    expect(() => createQueryArtifact({ title: 't', sql: '' })).toThrow();
  });

  test('rejects title > 255 chars', () => {
    expect(() => createQueryArtifact({ title: 'a'.repeat(256), sql: 'SELECT 1' })).toThrow();
  });
});

describe('updateQueryArtifact', () => {
  test('updates sql and bumps updatedAt', async () => {
    const a = createQueryArtifact({ title: 't', sql: 'SELECT 1' });
    await new Promise((r) => setTimeout(r, 2));
    const next = updateQueryArtifact(a, { sql: 'SELECT 2' });
    expect(next.sql).toBe('SELECT 2');
    expect(next.updatedAt.getTime()).toBeGreaterThan(a.updatedAt.getTime());
    expect(next.id).toBe(a.id);
  });

  test('omitted fields preserved', () => {
    const a = createQueryArtifact({
      title: 't',
      sql: 'SELECT 1',
      tags: ['x'],
    });
    const next = updateQueryArtifact(a, { sql: 'SELECT 2' });
    expect(next.tags).toEqual(['x']);
    expect(next.title).toBe('t');
  });
});

describe('recordQueryRun', () => {
  test('stamps lastResultMeta without altering other fields', () => {
    const a = createQueryArtifact({ title: 't', sql: 'SELECT 1' });
    const at = new Date();
    const next = recordQueryRun(a, { rowCount: 42, durationMs: 12, runAt: at });
    expect(next.lastResultMeta).toEqual({ rowCount: 42, durationMs: 12, runAt: at });
    expect(next.sql).toBe('SELECT 1');
    expect(next.id).toBe(a.id);
  });

  test('subsequent runs overwrite the previous run metadata', () => {
    const a = createQueryArtifact({ title: 't', sql: 'SELECT 1' });
    const first = recordQueryRun(a, { rowCount: 1, durationMs: 1, runAt: new Date(1000) });
    const second = recordQueryRun(first, { rowCount: 2, durationMs: 5, runAt: new Date(2000) });
    expect(second.lastResultMeta?.rowCount).toBe(2);
    expect(second.lastResultMeta?.runAt.getTime()).toBe(2000);
  });
});

describe('ArtifactSchema (discriminated union)', () => {
  test('accepts a valid query artifact', () => {
    const a = createQueryArtifact({ title: 't', sql: 'SELECT 1' });
    const r = ArtifactSchema.safeParse(a);
    expect(r.success).toBe(true);
  });

  test('rejects unknown artifact type values', () => {
    const r = ArtifactSchema.safeParse({
      type: 'report',
      id: '00000000-0000-0000-0000-000000000000',
      title: 't',
      description: '',
      tags: [],
      datasourceIds: [],
      sql: 'SELECT 1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(r.success).toBe(false);
  });
});
