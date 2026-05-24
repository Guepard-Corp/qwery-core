import { describe, expect, test } from 'bun:test';
import {
  createAgent,
  deleteAgent,
  getAgent,
  getAgentBySlug,
  listAgents,
  listAgentsByCapability,
  updateAgent,
} from '../agent';
import { InMemoryAgentRepo } from './repo-mocks';

function seed() {
  return { agentRepo: new InMemoryAgentRepo() };
}

describe('agent use cases', () => {
  test('createAgent persists', async () => {
    const deps = seed();
    const a = await createAgent(deps, { name: 'data-agent', role: 'role' });
    expect(await getAgent(deps, a.id)).toEqual(a);
  });

  test('updateAgent throws when not found', async () => {
    const deps = seed();
    await expect(updateAgent(deps, 'missing', { name: 'x' })).rejects.toThrow(/not found/);
  });

  test('updateAgent applies a patch', async () => {
    const deps = seed();
    const a = await createAgent(deps, { name: 'x', role: 'r' });
    const next = await updateAgent(deps, a.id, { capabilities: ['schema'] });
    expect(next.capabilities).toEqual(['schema']);
  });

  test('deleteAgent removes', async () => {
    const deps = seed();
    const a = await createAgent(deps, { name: 'x', role: 'r' });
    expect(await deleteAgent(deps, a.id)).toBe(true);
  });

  test('getAgent returns null for unknown', async () => {
    expect(await getAgent(seed(), 'missing')).toBeNull();
  });

  test('getAgentBySlug returns null when no match', async () => {
    expect(await getAgentBySlug(seed(), 'missing')).toBeNull();
  });

  test('listAgents returns all', async () => {
    const deps = seed();
    await createAgent(deps, { name: 'a', role: 'r' });
    await createAgent(deps, { name: 'b', role: 'r' });
    expect(await listAgents(deps)).toHaveLength(2);
  });

  test('listAgentsByCapability filters by tool name', async () => {
    const deps = seed();
    await createAgent(deps, { name: 'data', role: 'r', capabilities: ['schema', 'runQuery'] });
    await createAgent(deps, { name: 'coding', role: 'r', capabilities: ['edit'] });
    expect(await listAgentsByCapability(deps, 'schema')).toHaveLength(1);
    expect(await listAgentsByCapability(deps, 'nothere')).toHaveLength(0);
  });
});
