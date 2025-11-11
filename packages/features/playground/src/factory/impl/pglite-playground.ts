import { PGlite } from '@electric-sql/pglite';
import { z } from 'zod';

import type { DatasourceExtension } from '@qwery/extensions-sdk';
import {
  type DatasourceDriver,
  ExtensionScope,
  registerExtension,
} from '@qwery/extensions-sdk';

import type { PlaygroundDatabase } from '../playground-database';
import { PGliteDriver } from './pglite-driver';

// Register the pglite plugin at module load
const pgliteSchema = z.object({
  host: z.string().default('localhost').describe('Database host'),
  port: z.number().int().default(5432).describe('Database port'),
  database: z.string().default('playground').describe('Database name'),
  user: z.string().default('postgres').describe('Database user'),
  password: z.string().default('postgres').describe('Database password'),
  playground: z
    .boolean()
    .default(true)
    .describe('Indicates this is a playground datasource'),
  playgroundId: z.string().default('pglite').describe('Playground identifier'),
});

const pglitePlugin: DatasourceExtension<typeof pgliteSchema> = {
  id: 'pglite',
  name: 'Embedded PostgreSQL',
  logo: '/images/datasources/postgresql_icon_big.png',
  description: 'Test PostgreSQL queries in your browser using PGlite',
  tags: ['SQL', 'Playground', 'Browser'],
  scope: ExtensionScope.DATASOURCE,
  schema: pgliteSchema,
  getDriver: async (name: string, config: z.infer<typeof pgliteSchema>) => {
    return new PGliteDriver(name, config);
  },
};

registerExtension(pglitePlugin as unknown as DatasourceExtension);

export class PGlitePlayground implements PlaygroundDatabase {
  private db: PGlite | null = null;

  getConnectionConfig(): Record<string, unknown> {
    // PGlite runs in the browser, so we return a special config
    // that indicates this is a playground datasource
    return {
      host: 'localhost',
      port: 5432,
      database: 'playground',
      user: 'postgres',
      password: 'postgres',
      playground: true,
      playgroundId: 'pglite',
    };
  }

  async seed(driver: DatasourceDriver): Promise<void> {
    await driver.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create sample tables with prefilled data
    // Execute each statement separately for better error handling
    await driver.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await driver.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        category VARCHAR(50),
        stock INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await driver.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        total DECIMAL(10, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert sample data - check if data already exists first
    const usersResult = await driver.query(
      'SELECT COUNT(*) as count FROM users',
    );
    const usersCount = (usersResult.rows[0] as { count: number })?.count ?? 0;
    if (usersCount === 0) {
      await driver.query(`
        INSERT INTO users (name, email) VALUES
          ('John Doe', 'john.doe@example.com'),
          ('Jane Smith', 'jane.smith@example.com'),
          ('Bob Johnson', 'bob.johnson@example.com'),
          ('Alice Williams', 'alice.williams@example.com'),
          ('Charlie Brown', 'charlie.brown@example.com')
      `);
    }

    const productsResult = await driver.query(
      'SELECT COUNT(*) as count FROM products',
    );
    const productsCount =
      (productsResult.rows[0] as { count: number })?.count ?? 0;
    if (productsCount === 0) {
      await driver.query(`
        INSERT INTO products (name, price, category, stock) VALUES
          ('Laptop', 999.99, 'Electronics', 15),
          ('Mouse', 29.99, 'Electronics', 50),
          ('Keyboard', 79.99, 'Electronics', 30),
          ('Monitor', 249.99, 'Electronics', 20),
          ('Desk Chair', 199.99, 'Furniture', 10),
          ('Standing Desk', 399.99, 'Furniture', 5),
          ('Notebook', 9.99, 'Stationery', 100),
          ('Pen Set', 19.99, 'Stationery', 75)
      `);
    }

    const ordersResult = await driver.query(
      'SELECT COUNT(*) as count FROM orders',
    );
    const ordersCount = (ordersResult.rows[0] as { count: number })?.count ?? 0;
    if (ordersCount === 0) {
      await driver.query(`
        INSERT INTO orders (user_id, total, status) VALUES
          (1, 999.99, 'completed'),
          (1, 29.99, 'completed'),
          (2, 79.99, 'pending'),
          (2, 249.99, 'completed'),
          (3, 199.99, 'completed'),
          (4, 399.99, 'pending'),
          (5, 9.99, 'completed'),
          (5, 19.99, 'completed')
      `);
    }
  }
}
