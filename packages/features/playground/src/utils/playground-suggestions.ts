import { PLAYGROUND_TABLES } from './playground-sql';

export interface PlaygroundSuggestion {
  id: string;
  query: string;
  tables: string[];
}

export const PLAYGROUND_SUGGESTIONS: PlaygroundSuggestion[] = [
  {
    id: 'users-overview',
    query: 'Show me all users',
    tables: ['users'],
  },
  {
    id: 'products-by-category',
    query: 'List products by category',
    tables: ['products'],
  },
  {
    id: 'order-summary',
    query: 'Show order totals and status',
    tables: ['orders'],
  },
  {
    id: 'user-orders',
    query: 'Which users placed orders?',
    tables: ['users', 'orders'],
  },
  {
    id: 'product-inventory',
    query: 'Show products with low stock',
    tables: ['products'],
  },
  {
    id: 'revenue-analysis',
    query: 'Calculate total revenue',
    tables: ['orders'],
  },
  {
    id: 'user-activity',
    query: 'List users by registration date',
    tables: ['users'],
  },
  {
    id: 'order-details',
    query: 'Show orders with customer names',
    tables: ['users', 'orders'],
  },
  {
    id: 'top-products',
    query: 'What are the most expensive products?',
    tables: ['products'],
  },
  {
    id: 'pending-orders',
    query: 'Show all pending orders',
    tables: ['orders'],
  },
  {
    id: 'customer-spending',
    query: 'Calculate total spending per customer',
    tables: ['users', 'orders'],
  },
  {
    id: 'electronics-stock',
    query: 'Show electronics inventory levels',
    tables: ['products'],
  },
];

export function getRandomizedSuggestions(
  count: number = 3,
): PlaygroundSuggestion[] {
  const shuffled = [...PLAYGROUND_SUGGESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, PLAYGROUND_SUGGESTIONS.length));
}

export function getSuggestionById(
  id: string,
): PlaygroundSuggestion | undefined {
  return PLAYGROUND_SUGGESTIONS.find((suggestion) => suggestion.id === id);
}

export function getTableDefinitions(): string {
  return PLAYGROUND_TABLES.map(
    (table) =>
      `${table.name}${table.description ? ` - ${table.description}` : ''}`,
  ).join(', ');
}
