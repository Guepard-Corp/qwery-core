import { describe, it, expect } from 'vitest';
import { reducer, keyEventToKeyString } from '../src/state/reducer.ts';
import { initialState } from '../src/state/initial.ts';
import type { AppState } from '../src/state/types.ts';

describe('reducer', () => {
  it('resize updates width and height', () => {
    const state = initialState();
    const next = reducer(state, { type: 'resize', width: 100, height: 30 });
    expect(next.width).toBe(100);
    expect(next.height).toBe(30);
  });

  it('key: enter on home with input creates conversation and switches to chat', () => {
    const state = initialState();
    const withInput = { ...state, input: 'hello' };
    const next = reducer(withInput, { type: 'key', key: 'enter' });
    expect(next.currentScreen).toBe('chat');
    expect(next.conversations).toHaveLength(1);
    expect(next.conversations[0]?.messages).toHaveLength(1);
    expect(next.conversations[0]?.messages[0]?.content).toBe('hello');
    expect(next.input).toBe('');
    expect(next.agentBusy).toBe(true);
    expect(next.currentConversationId).toBe(next.conversations[0]?.id);
  });

  it('key: enter on home with empty input does nothing', () => {
    const state = initialState();
    const next = reducer(state, { type: 'key', key: 'enter' });
    expect(next.currentScreen).toBe('home');
    expect(next.input).toBe('');
  });

  it('key: tab cycles menu index', () => {
    const state = initialState();
    expect(state.selectedIdx).toBe(0);
    const next = reducer(state, { type: 'key', key: 'tab' });
    expect(next.selectedIdx).toBe(1);
    const next2 = reducer(next, { type: 'key', key: 'tab' });
    expect(next2.selectedIdx).toBe(0);
  });

  it('key: ctrl+p opens command dialog', () => {
    const state = initialState();
    const next = reducer(state, { type: 'key', key: 'ctrl+p' });
    expect(next.activeDialog).toBe('command');
    expect(next.commandPaletteSearch).toBe('');
  });

  it('key: ctrl+? opens help dialog', () => {
    const state = initialState();
    const next = reducer(state, { type: 'key', key: 'ctrl+?' });
    expect(next.activeDialog).toBe('help');
  });

  it('key: ? on home is typed into input (does not open help)', () => {
    const state = initialState();
    const next = reducer(state, { type: 'key', key: '?' });
    expect(next.activeDialog).toBe('none');
    expect(next.input).toBe('?');
  });

  it('key: escape in chat goes back to home', () => {
    const state: AppState = {
      ...initialState(),
      currentScreen: 'chat',
      agentBusy: false,
    };
    const next = reducer(state, { type: 'key', key: 'escape' });
    expect(next.currentScreen).toBe('home');
  });

  it('agent_response_ready appends message to conversation and clears busy', () => {
    const baseState = initialState();
    const convId = 'test-conv';
    const state: AppState = {
      ...baseState,
      currentScreen: 'chat',
      agentBusy: true,
      pendingUserMessage: 'hi',
      currentConversationId: convId,
      conversations: [
        {
          id: convId,
          title: 'hi',
          messages: [
            {
              role: 'user',
              content: 'hi',
              toolCalls: [],
              model: '',
              duration: '',
            },
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
    };
    const response = {
      role: 'assistant' as const,
      content: 'Hello!',
      toolCalls: [],
      model: 'Test',
      duration: '1s',
    };
    const next = reducer(state, {
      type: 'agent_response_ready',
      prompt: 'hi',
      response,
    });
    expect(next.conversations[0]?.messages).toHaveLength(2);
    expect(next.conversations[0]?.messages[1]?.content).toBe('Hello!');
    expect(next.pendingUserMessage).toBe('');
    expect(next.agentBusy).toBe(false);
  });

  it('open_dialog and close_dialog work correctly', () => {
    const state = initialState();
    const next = reducer(state, { type: 'open_dialog', dialog: 'help' });
    expect(next.activeDialog).toBe('help');
    const closed = reducer(next, { type: 'close_dialog' });
    expect(closed.activeDialog).toBe('none');
  });
});

describe('keyEventToKeyString', () => {
  it('returns escape for escape key', () => {
    expect(keyEventToKeyString({ name: 'escape' })).toBe('escape');
  });
  it('returns ctrl+enter for ctrl+return', () => {
    expect(keyEventToKeyString({ name: 'return', ctrl: true })).toBe(
      'ctrl+enter',
    );
  });
  it('returns single char for letter', () => {
    expect(keyEventToKeyString({ name: 'a' })).toBe('a');
  });
  it('returns space char for space key', () => {
    expect(keyEventToKeyString({ name: 'space' })).toBe(' ');
  });
});
