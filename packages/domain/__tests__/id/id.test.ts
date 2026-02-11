import { describe, expect, it } from 'vitest';
import { Id, type IdPrefix } from '../../src/id';

describe('Id', () => {
  const prefix: IdPrefix = 'project';

  describe('create', () => {
    it('generates id with correct prefix', () => {
      const id = Id.create(prefix);
      expect(id).toMatch(/^prj_[a-f0-9]{12}[A-Za-z0-9]{14}$/);
    });

    it('generates unique ids', () => {
      const a = Id.create(prefix);
      const b = Id.create(prefix);
      expect(a).not.toBe(b);
    });

    it('schema validates created id', () => {
      const id = Id.create(prefix);
      const schema = Id.schema(prefix);
      expect(schema.safeParse(id).success).toBe(true);
    });
  });

  describe('timestamp', () => {
    it('extracts timestamp (seconds) from ascending id', () => {
      const before = Math.floor(Date.now() / 1000);
      const id = Id.create(prefix, false);
      const after = Math.floor(Date.now() / 1000);
      const ts = Id.timestamp(id);
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after + 1);
    });
  });

  describe('schema', () => {
    it('rejects string without prefix', () => {
      const schema = Id.schema(prefix);
      expect(schema.safeParse('org_abc').success).toBe(false);
      expect(schema.safeParse('invalid').success).toBe(false);
    });
  });
});
