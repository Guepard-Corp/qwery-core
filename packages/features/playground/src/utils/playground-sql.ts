export interface TableDefinition {
  name: string;
  createTable: string;
  insertData: string;
  sampleData?: Array<Record<string, unknown>>;
  description?: string;
}

export const PLAYGROUND_TABLES: TableDefinition[] = [
  {
    name: 'users',
    description: 'User accounts with basic information',
    createTable: `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `,
    insertData: `
      INSERT INTO users (name, email) VALUES
        ('John Doe', 'john.doe@example.com'),
        ('Jane Smith', 'jane.smith@example.com'),
        ('Bob Johnson', 'bob.johnson@example.com'),
        ('Alice Williams', 'alice.williams@example.com'),
        ('Charlie Brown', 'charlie.brown@example.com')
    `,
    sampleData: [
      { id: 1, name: 'John Doe', email: 'john.doe@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane.smith@example.com' },
      { id: 3, name: 'Bob Johnson', email: 'bob.johnson@example.com' },
    ],
  },
  {
    name: 'products',
    description: 'Product catalog with pricing and inventory',
    createTable: `
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        category VARCHAR(50),
        stock INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `,
    insertData: `
      INSERT INTO products (name, price, category, stock) VALUES
        ('Laptop', 999.99, 'Electronics', 15),
        ('Mouse', 29.99, 'Electronics', 50),
        ('Keyboard', 79.99, 'Electronics', 30),
        ('Monitor', 249.99, 'Electronics', 20),
        ('Desk Chair', 199.99, 'Furniture', 10),
        ('Standing Desk', 399.99, 'Furniture', 5),
        ('Notebook', 9.99, 'Stationery', 100),
        ('Pen Set', 19.99, 'Stationery', 75)
    `,
    sampleData: [
      {
        id: 1,
        name: 'Laptop',
        price: '999.99',
        category: 'Electronics',
        stock: 15,
      },
      {
        id: 2,
        name: 'Mouse',
        price: '29.99',
        category: 'Electronics',
        stock: 50,
      },
      {
        id: 3,
        name: 'Keyboard',
        price: '79.99',
        category: 'Electronics',
        stock: 30,
      },
    ],
  },
  {
    name: 'orders',
    description: 'Customer orders with status tracking',
    createTable: `
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        total DECIMAL(10, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `,
    insertData: `
      INSERT INTO orders (user_id, total, status) VALUES
        (1, 999.99, 'completed'),
        (1, 29.99, 'completed'),
        (2, 79.99, 'pending'),
        (2, 249.99, 'completed'),
        (3, 199.99, 'completed'),
        (4, 399.99, 'pending'),
        (5, 9.99, 'completed'),
        (5, 19.99, 'completed')
    `,
    sampleData: [
      { id: 1, user_id: 1, total: '999.99', status: 'completed' },
      { id: 2, user_id: 1, total: '29.99', status: 'completed' },
      { id: 3, user_id: 2, total: '79.99', status: 'pending' },
    ],
  },
];

export function getTableCountQuery(tableName: string): string {
  return `SELECT COUNT(*) as count FROM ${tableName}`;
}

export function getTableSampleQuery(tableName: string, limit = 3): string {
  return `SELECT * FROM ${tableName} LIMIT ${limit}`;
}

export function getAllTablesInfo(): string {
  return PLAYGROUND_TABLES.map(
    (table) =>
      `Table: ${table.name}${table.description ? ` - ${table.description}` : ''}`,
  ).join('\n');
}
