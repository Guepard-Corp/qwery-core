import { describe, expect, test } from 'bun:test';
import { CreateSessionInputSchema, createSession, SessionSchema, updateSession } from '../session.entity';

describe('createSession', () => {
  test('initialises with a uuid id, a slug, timestamps and an empty datasources array', () => {
    const s = createSession({ title: 'Quarterly review' });
    expect(s.title).toBe('Quarterly review');
    expect(s.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(s.slug.length).toBeGreaterThan(0);
    expect(s.datasources).toEqual([]);
    expect(s.createdAt).toBeInstanceOf(Date);
    expect(s.updatedAt).toBeInstanceOf(Date);
    expect(s.createdAt.getTime()).toBe(s.updatedAt.getTime());
  });

  test('honors seedMessage and an initial datasource list', () => {
    const s = createSession({
      title: 't',
      seedMessage: 'Show top customers',
      datasources: ['ds_1', 'ds_2'],
    });
    expect(s.seedMessage).toBe('Show top customers');
    expect(s.datasources).toEqual(['ds_1', 'ds_2']);
  });

  test('CreateSessionInputSchema rejects an empty title', () => {
    expect(() => CreateSessionInputSchema.parse({ title: '' })).toThrow();
  });

  test('CreateSessionInputSchema rejects an empty datasource id', () => {
    expect(() => CreateSessionInputSchema.parse({ title: 'ok', datasources: [''] })).toThrow();
  });
});

describe('updateSession', () => {
  test('updates title and bumps updatedAt', async () => {
    const s = createSession({ title: 'old' });
    // ensure a different ms so the comparison can be strict
    await new Promise((r) => setTimeout(r, 2));
    const next = updateSession(s, { title: 'new' });
    expect(next.title).toBe('new');
    expect(next.updatedAt.getTime()).toBeGreaterThan(s.updatedAt.getTime());
    // createdAt is preserved
    expect(next.createdAt.getTime()).toBe(s.createdAt.getTime());
  });

  test('omitted fields are preserved (partial update)', () => {
    const s = createSession({ title: 'old', datasources: ['a'] });
    const next = updateSession(s, { title: 'new' });
    expect(next.datasources).toEqual(['a']);
  });

  test('updating datasources to an empty array is allowed', () => {
    const s = createSession({ title: 't', datasources: ['a'] });
    const next = updateSession(s, { datasources: [] });
    expect(next.datasources).toEqual([]);
  });
});

describe('SessionSchema', () => {
  test('rejects an invalid uuid id', () => {
    expect(() =>
      SessionSchema.parse({
        id: 'not-a-uuid',
        title: 't',
        slug: 's',
        datasources: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ).toThrow();
  });
});
