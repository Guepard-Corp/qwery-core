import { describe, expect, test } from 'bun:test';
import { AgentSchema, createAgent, updateAgent } from '../agent.entity';

describe('createAgent', () => {
  test('assigns id, slug, default empty description/capabilities/policies', () => {
    const a = createAgent({ name: 'data-agent', role: 'You analyse data.' });
    expect(a.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(a.slug.length).toBeGreaterThan(0);
    expect(a.name).toBe('data-agent');
    expect(a.role).toBe('You analyse data.');
    expect(a.description).toBe('');
    expect(a.capabilities).toEqual([]);
    expect(a.policies).toEqual([]);
  });

  test('honors provided capabilities and policies', () => {
    const a = createAgent({
      name: 'x',
      role: 'role',
      capabilities: ['schema', 'runQuery'],
      policies: ['confirm-destructive'],
    });
    expect(a.capabilities).toEqual(['schema', 'runQuery']);
    expect(a.policies).toEqual(['confirm-destructive']);
  });

  test('rejects an empty name', () => {
    expect(() => createAgent({ name: '', role: 'r' })).toThrow();
  });

  test('rejects an empty role', () => {
    expect(() => createAgent({ name: 'n', role: '' })).toThrow();
  });
});

describe('updateAgent', () => {
  test('updates capabilities and bumps updatedAt', async () => {
    const a = createAgent({ name: 'x', role: 'r' });
    await new Promise((r) => setTimeout(r, 2));
    const next = updateAgent(a, { capabilities: ['schema'] });
    expect(next.capabilities).toEqual(['schema']);
    expect(next.updatedAt.getTime()).toBeGreaterThan(a.updatedAt.getTime());
    expect(next.id).toBe(a.id);
  });

  test('omitted fields are preserved', () => {
    const a = createAgent({
      name: 'x',
      role: 'r',
      capabilities: ['schema'],
      policies: ['confirm'],
    });
    const next = updateAgent(a, { name: 'y' });
    expect(next.capabilities).toEqual(['schema']);
    expect(next.policies).toEqual(['confirm']);
  });
});

describe('AgentSchema', () => {
  test('rejects a name longer than 255 chars', () => {
    expect(() => createAgent({ name: 'a'.repeat(256), role: 'r' })).toThrow();
  });

  test('rejects an invalid uuid id', () => {
    expect(() =>
      AgentSchema.parse({
        id: 'not-a-uuid',
        slug: 's',
        name: 'n',
        role: 'r',
        capabilities: [],
        policies: [],
        description: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ).toThrow();
  });
});
