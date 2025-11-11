import { DatasourceDriver } from '@qwery/extensions-sdk';

/**
 * Abstract interface for playground database implementations
 * Each playground database runs in the browser and provides a prefilled database
 * for testing the product
 */
export interface PlaygroundDatabase {
  /**
   * Get the connection configuration for the datasource
   * This config will be used to create a datasource record
   */
  getConnectionConfig(): Record<string, unknown>;

  /**
   * Seed the database with sample/prefilled data
   * @param driver - The driver to use to seed the database
   */
  seed(driver: DatasourceDriver): Promise<void>;
}
