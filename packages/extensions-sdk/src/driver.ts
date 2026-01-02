import type { DriverFactory } from './types';

/**
 * Identity helper so sample code can use `makeDriver` while keeping the
 * factory signature explicit. 
 */
export function makeDriver(factory: DriverFactory): DriverFactory {
  return factory;
}
