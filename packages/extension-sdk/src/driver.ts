import type { DriverFactory } from './types';

/**
 * Identity helper. Lets extension authors write:
 *   export const driverFactory = makeDriver((ctx) => ({ ... }));
 * while keeping the factory signature explicit + type-checked.
 */
export function makeDriver(factory: DriverFactory): DriverFactory {
  return factory;
}
