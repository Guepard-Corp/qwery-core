import type { Meta, StoryObj } from '@storybook/react';
import { z } from 'zod';

import { FormRenderer } from './form-renderer';

const datasourceSchema = z.object({
  name: z.string().min(1).meta({
    label: 'Datasource name',
    description: 'A friendly name for this connection.',
    placeholder: 'Production PostgreSQL',
  }),
  provider: z.enum(['postgresql', 'mysql', 'clickhouse', 'pglite']).meta({
    label: 'Provider',
    description: 'Database engine used by this datasource.',
  }),
  host: z.string().min(1).meta({
    label: 'Host',
    description: 'Hostname or IP of your database server.',
    placeholder: 'db.internal.example.com',
  }),
  port: z.number().int().min(1).max(65535).meta({
    label: 'Port',
    description: 'TCP port your database listens on.',
    placeholder: '5432',
  }),
  database: z.string().min(1).meta({
    label: 'Database',
    description: 'Default database/schema to use for this connection.',
    placeholder: 'app_production',
  }),
  username: z.string().min(1).meta({
    label: 'Username',
    description: 'Database user with read access to your data.',
    placeholder: 'readonly_user',
  }),
  password: z.string().min(1).meta({
    label: 'Password',
    description:
      'Database password. Stored encrypted; existing values are masked.',
    placeholder: '••••••••••',
    secret: true,
  }),
  ssl: z.boolean().default(true).meta({
    label: 'Use SSL',
    description: 'Enable SSL/TLS when connecting to the database.',
  }),
  sslMode: z.enum(['disable', 'prefer', 'require']).default('require').meta({
    label: 'SSL mode',
    description: 'How strictly SSL should be enforced by the client.',
  }),
});

const datasourceConnectionSchema = z.union([
  z
    .object({
      connectionUrl: z.string().url().meta({
        label: 'Connection URL',
        description:
          'Full database connection string (e.g. postgres://user:pass@host:5432/db).',
        placeholder: 'postgres://user:pass@host:5432/db',
      }),
    })
    .meta({
      label: 'Connection via URL',
      description: 'Configure this datasource using a single connection URL.',
    }),
  z
    .object({
      host: z.string().min(1).meta({
        label: 'Host',
        description: 'Hostname or IP of your database server.',
        placeholder: 'db.internal.example.com',
      }),
      port: z.number().int().min(1).max(65535).meta({
        label: 'Port',
        description: 'TCP port your database listens on.',
        placeholder: '5432',
      }),
      database: z.string().min(1).meta({
        label: 'Database',
        description: 'Default database/schema to use for this connection.',
        placeholder: 'app_production',
      }),
    })
    .meta({
      label: 'Connection via fields',
      description: 'Configure this datasource using host/port/database fields.',
    }),
]);

const meta: Meta<typeof FormRenderer> = {
  title: 'Qwery/Forms/Datasource FormRenderer',
  component: FormRenderer,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;

type Story = StoryObj<typeof FormRenderer>;

export const Basic: Story = {
  args: {
    schema: datasourceSchema,
    defaultValues: {
      provider: 'postgresql',
      port: 5432,
      ssl: true,
      sslMode: 'require',
    },
    formId: 'storybook-form-renderer',
    onSubmit: async () => {
      // Intentionally left blank for Storybook; see form behavior in the UI.
    },
  },
};

export const ConnectionUrlOrFields: Story = {
  args: {
    schema: datasourceConnectionSchema,
    defaultValues: {
      port: 5432,
      database: 'app_production',
    },
    formId: 'storybook-form-renderer-union',
    onSubmit: async () => {
      // Intentionally left blank for Storybook; see union behavior in the UI.
    },
  },
};
