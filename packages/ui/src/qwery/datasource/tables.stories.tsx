import type { Meta, StoryObj } from '@storybook/react';
import { Tables } from './tables';

const meta: Meta<typeof Tables> = {
  title: 'Qwery/Datasource/Tables',
  component: Tables,
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof Tables>;

const mockTables = [
  {
    tableName: 'users',
    schema: 'public',
    description: 'User accounts and authentication information',
    rowsEstimated: 1250000,
    sizeEstimated: '245 MB',
    numberOfColumns: 12,
  },
  {
    tableName: 'orders',
    schema: 'public',
    description: 'Customer orders and transaction records',
    rowsEstimated: 850000,
    sizeEstimated: '180 MB',
    numberOfColumns: 15,
  },
  {
    tableName: 'products',
    schema: 'public',
    description: null,
    rowsEstimated: 45000,
    sizeEstimated: '12 MB',
    numberOfColumns: 8,
  },
  {
    tableName: 'order_items',
    schema: 'public',
    description: 'Individual items within each order',
    rowsEstimated: 3200000,
    sizeEstimated: '420 MB',
    numberOfColumns: 6,
  },
  {
    tableName: 'categories',
    schema: 'public',
    description: 'Product categorization and taxonomy',
    rowsEstimated: 150,
    sizeEstimated: '45 KB',
    numberOfColumns: 4,
  },
];

export const Basic: Story = {
  args: {
    tables: mockTables,
  },
};

export const Empty: Story = {
  args: {
    tables: [],
  },
};

export const WithClickHandler: Story = {
  args: {
    tables: mockTables,
    onTableClick: (table) => {
      console.log('Table clicked:', table);
    },
  },
};

export const SingleTable: Story = {
  args: {
    tables: [mockTables[0]!],
  },
};

export const ManyTables: Story = {
  args: {
    tables: [
      ...mockTables,
      {
        tableName: 'invoices',
        schema: 'public',
        description: 'Billing and invoice records',
        rowsEstimated: 500000,
        sizeEstimated: '95 MB',
        numberOfColumns: 10,
      },
      {
        tableName: 'payments',
        schema: 'public',
        description: 'Payment transactions and history',
        rowsEstimated: 750000,
        sizeEstimated: '150 MB',
        numberOfColumns: 9,
      },
      {
        tableName: 'addresses',
        schema: 'public',
        description: null,
        rowsEstimated: 200000,
        sizeEstimated: '38 MB',
        numberOfColumns: 7,
      },
    ],
  },
};
