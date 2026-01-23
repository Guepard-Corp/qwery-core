import type { IDataSourceDriver } from '@qwery/extensions-sdk';

/**
 * Abstract interface for playground database implementations
 * Each playground database runs in the browser and provides a prefilled database
 * for testing the product
 */
export interface PlaygroundDatabase {
  /**
   * Get the connection configuration for the datasource
   * This config will be used to create a datasource record
   * @param projectId Optional project ID to create unique database names
   */
  getConnectionConfig(projectId?: string): Record<string, unknown>;

  /**
   * Seed the database with sample/prefilled data
   * @param driver - The driver to use to seed the database
   * @param config - The configuration for the driver
   */
  seed(
    driver: IDataSourceDriver,
    config: Record<string, unknown>,
  ): Promise<void>;
}
