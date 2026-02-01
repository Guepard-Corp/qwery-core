import { describe, it, expect } from 'vitest';
import { mockLLMResponse } from '../src/mock-agent.ts';

describe('mockLLMResponse', () => {
  it('returns assistant message with role assistant', () => {
    const msg = mockLLMResponse('hello');
    expect(msg.role).toBe('assistant');
    expect(msg.content).toContain('hello');
    expect(msg.model).toBe('Qwery Engine');
    expect(msg.duration).toBe('2.1s');
  });

  it('returns specific content for "who are you"', () => {
    const msg = mockLLMResponse('who are you');
    expect(msg.content).toContain('Qwery');
    expect(msg.toolCalls).toHaveLength(1);
    expect(msg.toolCalls[0]?.name).toBe('WebFetch');
    expect(msg.toolCalls[0]?.args).toBe('https://qwery.run');
    expect(msg.toolCalls[0]?.status).toBe('success');
  });

  it('returns specific content for "what can you do"', () => {
    const msg = mockLLMResponse('what can you do');
    expect(msg.content).toContain('Query databases');
    expect(msg.toolCalls).toHaveLength(1);
    expect(msg.toolCalls[0]?.name).toBe('Read');
  });

  it('returns bash output for "run" prompt', () => {
    const msg = mockLLMResponse('run this query');
    expect(msg.content).toContain('1,542 users');
    expect(msg.toolCalls).toHaveLength(1);
    expect(msg.toolCalls[0]?.name).toBe('bash');
    expect(msg.toolCalls[0]?.output).toContain('count');
  });

  it('returns edit diff for "fix" prompt', () => {
    const msg = mockLLMResponse('fix the config');
    expect(msg.toolCalls).toHaveLength(1);
    expect(msg.toolCalls[0]?.name).toBe('edit');
    expect(msg.toolCalls[0]?.output).toContain('@@');
    expect(msg.toolCalls[0]?.output).toContain('+');
    expect(msg.toolCalls[0]?.output).toContain('-');
  });

  it('returns error status for "error" prompt', () => {
    const msg = mockLLMResponse('show me an error');
    expect(msg.toolCalls).toHaveLength(1);
    expect(msg.toolCalls[0]?.status).toBe('error');
    expect(msg.toolCalls[0]?.output).toContain('ERROR');
  });
});
