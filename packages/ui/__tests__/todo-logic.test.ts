import { describe, expect, it } from 'vitest';
import {
  getTaskDelimiterForToolPart,
  isToolPart,
  parseTodosFromPart,
} from '../src/qwery/ai/utils/todo-logic';

describe('isToolPart', () => {
  it('returns true for tool-getSchema', () => {
    expect(isToolPart({ type: 'tool-getSchema' })).toBe(true);
  });
  it('returns true for tool-runQuery', () => {
    expect(isToolPart({ type: 'tool-runQuery' })).toBe(true);
  });
  it('returns false for text', () => {
    expect(isToolPart({ type: 'text' })).toBe(false);
  });
  it('returns true for tool-todowrite', () => {
    expect(isToolPart({ type: 'tool-todowrite' })).toBe(true);
  });
});

describe('parseTodosFromPart', () => {
  it('parses todos from todowrite input', () => {
    const part = {
      type: 'tool-todowrite',
      input: {
        todos: [
          {
            id: '1',
            content: 'Fetch schema',
            status: 'in_progress',
            priority: 'high',
          },
        ],
      },
    };
    expect(parseTodosFromPart(part)).toEqual([
      {
        id: '1',
        content: 'Fetch schema',
        status: 'in_progress',
        priority: 'high',
      },
    ]);
  });
});

describe('getTaskDelimiterForToolPart', () => {
  it('Case 1: delimiter only before first tool after todowrite', () => {
    const parts = [
      { type: 'text' },
      {
        type: 'tool-todowrite',
        input: {
          todos: [
            {
              id: '1',
              content: 'Fetch schema',
              status: 'in_progress',
              priority: 'high',
            },
            {
              id: '2',
              content: 'Run query',
              status: 'pending',
              priority: 'medium',
            },
          ],
        },
      },
      { type: 'tool-getSchema' },
      { type: 'tool-runQuery' },
      {
        type: 'tool-todowrite',
        input: {
          todos: [
            {
              id: '1',
              content: 'Fetch schema',
              status: 'completed',
              priority: 'high',
            },
            {
              id: '2',
              content: 'Run query',
              status: 'in_progress',
              priority: 'medium',
            },
          ],
        },
      },
    ];
    const getSchemaIndex = 2;
    const runQueryIndex = 3;
    const result = getTaskDelimiterForToolPart(parts, getSchemaIndex);
    expect(result).not.toBeNull();
    expect(result!.taskIndex).toBe(1);
    expect(result!.taskTitle).toBe('Fetch schema');
    expect(result!.todos).toHaveLength(2);
    expect(getTaskDelimiterForToolPart(parts, runQueryIndex)).toBeNull();
  });

  it('Case 2: no todo before tool returns null', () => {
    const parts = [{ type: 'text' }, { type: 'tool-getSchema' }];
    const getSchemaIndex = 1;
    expect(getTaskDelimiterForToolPart(parts, getSchemaIndex)).toBeNull();
  });

  it('Case 3: shows delimiter for completed tasks when plan concluded', () => {
    const parts = [
      {
        type: 'tool-todowrite',
        input: {
          todos: [
            { id: '1', content: 'Fetch schema', status: 'completed' },
            { id: '2', content: 'Run query', status: 'completed' },
          ],
        },
      },
      { type: 'tool-getSchema' },
      { type: 'tool-runQuery' },
    ];
    const getSchemaIndex = 1;
    const runQueryIndex = 2;
    const getSchemaResult = getTaskDelimiterForToolPart(parts, getSchemaIndex);
    const runQueryResult = getTaskDelimiterForToolPart(parts, runQueryIndex);
    expect(getSchemaResult).not.toBeNull();
    expect(getSchemaResult!.taskTitle).toBe('Fetch schema');
    expect(runQueryResult).not.toBeNull();
    expect(runQueryResult!.taskTitle).toBe('Run query');
  });
});
