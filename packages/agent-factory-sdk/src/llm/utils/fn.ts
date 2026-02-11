import { z } from 'zod';

/**
 * Typed validated function wrapper adapted from opencode util/fn.
 * Returns a function that parses input with schema then runs the callback.
 */
export function fn<T extends z.ZodType, Result>(
  schema: T,
  cb: (input: z.infer<T>) => Result,
) {
  const result = (input: z.infer<T>) => {
    const parsed = schema.parse(input);
    return cb(parsed);
  };
  result.force = (input: z.infer<T>) => cb(input);
  result.schema = schema;
  return result;
}
