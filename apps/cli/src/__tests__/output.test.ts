import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  printOutput,
  printInteractiveResult,
  resolveFormat,
} from '../utils/output';

describe('output utilities', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let consoleLogSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('resolveFormat', () => {
    it('returns table by default', () => {
      expect(resolveFormat()).toBe('table');
    });

    it('returns table for undefined', () => {
      expect(resolveFormat(undefined)).toBe('table');
    });

    it('returns json for "json"', () => {
      expect(resolveFormat('json')).toBe('json');
    });

    it('returns json for "JSON" (case insensitive)', () => {
      expect(resolveFormat('JSON')).toBe('json');
    });

    it('returns table for invalid format', () => {
      expect(resolveFormat('invalid')).toBe('table');
    });
  });

  describe('printOutput', () => {
    it('prints JSON format correctly', () => {
      const data = { id: '1', name: 'test' };
      printOutput(data, 'json');
      expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(data, null, 2));
    });

    it('prints empty message for empty array', () => {
      printOutput([], 'table', 'No data');
      expect(consoleLogSpy).toHaveBeenCalledWith('No data');
    });

    it('prints table for array data', () => {
      const data = [{ id: '1', name: 'test' }];
      printOutput(data, 'table');
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('prints table for object data', () => {
      const data = { id: '1', name: 'test' };
      printOutput(data, 'table');
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('serializes nested objects in table mode', () => {
      const data = [{ nested: { value: 'test' } }];
      printOutput(data, 'table');
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('printInteractiveResult', () => {
    it('prints empty result message', () => {
      printInteractiveResult({
        sql: 'SELECT 1',
        rows: [],
        rowCount: 0,
      });
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('prints table for results', () => {
      printInteractiveResult({
        sql: 'SELECT 1 as value',
        rows: [{ value: 1 }],
        rowCount: 1,
      });
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('prints row count summary', () => {
      printInteractiveResult({
        sql: 'SELECT 1',
        rows: [{ value: 1 }],
        rowCount: 1,
      });
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('prints plural row count', () => {
      printInteractiveResult({
        sql: 'SELECT 1',
        rows: [{ value: 1 }, { value: 2 }],
        rowCount: 2,
      });
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });
});
