import { describe, expect, test } from 'bun:test';
import {
  createSession,
  deleteSession,
  getSession,
  getSessionBySlug,
  linkDatasource,
  listSessions,
  listSessionsByDatasource,
  unlinkDatasource,
  updateSession,
} from '../session';
import { InMemorySessionRepo } from './repo-mocks';

function seed() {
  const sessionRepo = new InMemorySessionRepo();
  return { sessionRepo };
}

describe('session use cases', () => {
  test('createSession persists a new entity', async () => {
    const deps = seed();
    const s = await createSession(deps, { title: 'T' });
    expect(await deps.sessionRepo.findById(s.id)).toEqual(s);
  });

  test('getSession returns null for unknown id', async () => {
    const deps = seed();
    expect(await getSession(deps, 'missing')).toBeNull();
  });

  test('getSessionBySlug returns the matching session', async () => {
    const deps = seed();
    const s = await createSession(deps, { title: 'T' });
    expect(await getSessionBySlug(deps, s.slug)).toEqual(s);
  });

  test('listSessions returns all sessions', async () => {
    const deps = seed();
    await createSession(deps, { title: 'A' });
    await createSession(deps, { title: 'B' });
    const all = await listSessions(deps);
    expect(all).toHaveLength(2);
  });

  test('updateSession throws when session missing', async () => {
    const deps = seed();
    await expect(updateSession(deps, 'missing', { title: 'x' })).rejects.toThrow(/not found/);
  });

  test('updateSession applies the patch', async () => {
    const deps = seed();
    const s = await createSession(deps, { title: 'old' });
    const next = await updateSession(deps, s.id, { title: 'new' });
    expect(next.title).toBe('new');
  });

  test('deleteSession removes the entity', async () => {
    const deps = seed();
    const s = await createSession(deps, { title: 'x' });
    expect(await deleteSession(deps, s.id)).toBe(true);
    expect(await getSession(deps, s.id)).toBeNull();
  });
});

describe('linkDatasource / unlinkDatasource', () => {
  test('link appends a datasource id', async () => {
    const deps = seed();
    const s = await createSession(deps, { title: 'x' });
    const next = await linkDatasource(deps, { sessionId: s.id, datasourceId: 'ds_1' });
    expect(next.datasources).toEqual(['ds_1']);
  });

  test('link is idempotent — same id twice keeps a single entry', async () => {
    const deps = seed();
    const s = await createSession(deps, { title: 'x' });
    await linkDatasource(deps, { sessionId: s.id, datasourceId: 'ds_1' });
    const next = await linkDatasource(deps, { sessionId: s.id, datasourceId: 'ds_1' });
    expect(next.datasources).toEqual(['ds_1']);
  });

  test('link throws when session missing', async () => {
    const deps = seed();
    await expect(linkDatasource(deps, { sessionId: 'missing', datasourceId: 'ds' })).rejects.toThrow(
      /not found/,
    );
  });

  test('unlink removes the datasource', async () => {
    const deps = seed();
    const s = await createSession(deps, { title: 'x', datasources: ['ds_1', 'ds_2'] });
    const next = await unlinkDatasource(deps, { sessionId: s.id, datasourceId: 'ds_1' });
    expect(next.datasources).toEqual(['ds_2']);
  });

  test('unlink is a no-op when the datasource was not linked', async () => {
    const deps = seed();
    const s = await createSession(deps, { title: 'x', datasources: ['ds_1'] });
    const next = await unlinkDatasource(deps, { sessionId: s.id, datasourceId: 'missing' });
    expect(next.datasources).toEqual(['ds_1']);
  });

  test('unlink throws when session missing', async () => {
    const deps = seed();
    await expect(unlinkDatasource(deps, { sessionId: 'missing', datasourceId: 'ds' })).rejects.toThrow(
      /not found/,
    );
  });

  test('listSessionsByDatasource filters correctly', async () => {
    const deps = seed();
    await createSession(deps, { title: 'a', datasources: ['ds_1'] });
    await createSession(deps, { title: 'b', datasources: ['ds_2'] });
    await createSession(deps, { title: 'c', datasources: ['ds_1', 'ds_2'] });
    const ds1 = await listSessionsByDatasource(deps, 'ds_1');
    expect(ds1).toHaveLength(2);
  });
});
