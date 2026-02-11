import { describe, expect, it } from 'vitest';
import { Entity } from '../../src/common/entity';
import { z } from 'zod';

const TestSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
});

class TestEntity extends Entity<string, typeof TestSchema> {
  public id: string;
  public name: string;

  constructor(data: { id: string; name: string }) {
    super(TestSchema, data.id);
    this.id = data.id;
    this.name = data.name;
  }

  protected getData(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
    };
  }
}

describe('Entity', () => {
  describe('getData', () => {
    it('should return entity data', () => {
      const entity = new TestEntity({ id: 'test-id', name: 'Test Name' });
      const data = entity['getData']();

      expect(data).toEqual({
        id: 'test-id',
        name: 'Test Name',
      });
    });

    it('should return base entity data with id', () => {
      // Test the base Entity.getData() method directly
      class BaseTestEntity extends Entity<string, typeof TestSchema> {
        constructor(id: string) {
          super(TestSchema, id);
        }
      }

      const entity = new BaseTestEntity('test-id');
      const data = entity['getData']();

      // Base getData only returns { id }
      expect(data).toEqual({ id: 'test-id' });
    });
  });

  describe('toDto', () => {
    it('should convert entity to DTO', () => {
      const entity = new TestEntity({ id: 'test-id', name: 'Test Name' });
      const dto = entity.toDto<{ id: string; name: string }>();

      expect(dto.id).toBe('test-id');
      expect(dto.name).toBe('Test Name');
    });

    it('should exclude schema from DTO', () => {
      const entity = new TestEntity({ id: 'test-id', name: 'Test Name' });
      const dto = entity.toDto<{ id: string; name: string }>();

      expect('schema' in dto).toBe(false);
    });
  });

  describe('validate', () => {
    it('should validate valid entity', async () => {
      const entity = new TestEntity({ id: 'test-id', name: 'Test Name' });
      await expect(entity.validate()).resolves.not.toThrow();
    });

    it('should throw Exception for invalid entity', async () => {
      // Create entity with invalid data (empty id violates schema)
      const entity = new TestEntity({ id: '', name: 'Test Name' });
      // The schema requires id to be a non-empty string, so validation should fail
      await expect(entity.validate()).rejects.toThrow();
    });
  });
});
