import { z } from 'zod';

import { Code } from './code';
import { Optional } from './common-types';
import { Exception } from './exception';

export class Entity<
  TIdentifier extends string | number,
  TSchema extends z.ZodTypeAny = z.ZodTypeAny,
> {
  protected id: Optional<TIdentifier>;
  protected schema: TSchema;

  constructor(schema: TSchema, id?: TIdentifier) {
    this.schema = schema;
    this.id = id;
  }

  public getId(): TIdentifier {
    if (typeof this.id === 'undefined') {
      throw Exception.new({
        code: Code.ENTITY_VALIDATION_ERROR,
        overrideMessage: `${this.constructor.name}: ID is empty.`,
      });
    }

    return this.id;
  }

  protected getData(): Record<string, unknown> {
    const data: Record<string, unknown> = { id: this.id };
    return data;
  }

  public toDto<T extends Record<string, unknown>>(): T {
    const data = this.getData();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { schema, ...serializable } = data;
    return serializable as T;
  }

  public async validate(): Promise<void> {
    const data = this.getData();
    const result = this.schema.safeParse(data);

    if (!result.success) {
      throw Exception.new({
        code: Code.ENTITY_VALIDATION_ERROR,
        data: result.error.format(),
      });
    }
  }
}
