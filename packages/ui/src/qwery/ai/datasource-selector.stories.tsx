import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider } from 'next-themes';
import { DatasourceSelector, type DatasourceItem } from './datasource-selector';

const meta: Meta<typeof DatasourceSelector> = {
  title: 'Qwery/AI/Datasource Selector',
  component: DatasourceSelector,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <ThemeProvider attribute="class" enableSystem defaultTheme="system">
        <div className="p-8">
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DatasourceSelector>;

const mockDatasources: DatasourceItem[] = [
  {
    id: 'ds-1',
    name: 'PostgreSQL Database',
    slug: 'postgres-db',
    datasource_provider: 'postgresql',
  },
  {
    id: 'ds-2',
    name: 'MySQL Database',
    slug: 'mysql-db',
    datasource_provider: 'mysql',
  },
  {
    id: 'ds-3',
    name: 'SQLite Database',
    slug: 'sqlite-db',
    datasource_provider: 'sqlite',
  },
  {
    id: 'ds-4',
    name: 'MongoDB Database',
    slug: 'mongodb-db',
    datasource_provider: 'mongodb',
  },
  {
    id: 'ds-5',
    name: 'Redis Cache',
    slug: 'redis-cache',
    datasource_provider: 'redis',
  },
  {
    id: 'ds-6',
    name: 'Elasticsearch',
    slug: 'elasticsearch',
    datasource_provider: 'elasticsearch',
  },
  {
    id: 'ds-7',
    name: 'DuckDB Database',
    slug: 'duckdb-db',
    datasource_provider: 'duckdb',
  },
  {
    id: 'ds-8',
    name: 'Neon Database',
    slug: 'neon-db',
    datasource_provider: 'neon',
  },
  {
    id: 'ds-9',
    name: 'Supabase Database',
    slug: 'supabase-db',
    datasource_provider: 'supabase',
  },
  {
    id: 'ds-10',
    name: 'PGLite Database',
    slug: 'pglite-db',
    datasource_provider: 'pglite',
  },
];

const mockPluginLogoMap = new Map<string, string>([
  ['postgresql', '/images/datasources/postgresql_icon.png'],
  ['mysql', '/images/datasources/mysql_icon.png'],
  ['sqlite', '/images/datasources/sqlite_icon.png'],
  ['mongodb', '/images/datasources/mongodb_icon.png'],
  ['redis', '/images/datasources/redis_icon.png'],
  ['elasticsearch', '/images/datasources/elasticsearch_icon.png'],
  ['duckdb', '/images/datasources/duckdb_icon.png'],
  ['neon', '/images/datasources/neon_icon.png'],
  ['supabase', '/images/datasources/supabase_icon.png'],
  ['pglite', '/images/datasources/pglite_icon.png'],
]);

const DefaultComponent = () => {
  const [selected, setSelected] = React.useState<string[]>([]);

  return (
    <div className="flex items-center gap-4">
      <DatasourceSelector
        selectedDatasources={selected}
        onSelectionChange={setSelected}
        datasources={mockDatasources}
        pluginLogoMap={mockPluginLogoMap}
      />
      <div className="text-muted-foreground text-sm">
        Selected: {selected.length === 0 ? 'None' : selected.join(', ')}
      </div>
    </div>
  );
};

export const Default: Story = {
  render: () => <DefaultComponent />,
};

const SingleSelectionComponent = () => {
  const [selected, setSelected] = React.useState<string[]>(['ds-1']);

  return (
    <div className="flex items-center gap-4">
      <DatasourceSelector
        selectedDatasources={selected}
        onSelectionChange={setSelected}
        datasources={mockDatasources}
        pluginLogoMap={mockPluginLogoMap}
      />
      <div className="text-muted-foreground text-sm">
        Selected: {selected.length === 0 ? 'None' : selected.join(', ')}
      </div>
    </div>
  );
};

export const SingleSelection: Story = {
  render: () => <SingleSelectionComponent />,
};

const MultipleSelectionComponent = () => {
  const [selected, setSelected] = React.useState<string[]>([
    'ds-1',
    'ds-2',
    'ds-3',
  ]);

  return (
    <div className="flex items-center gap-4">
      <DatasourceSelector
        selectedDatasources={selected}
        onSelectionChange={setSelected}
        datasources={mockDatasources}
        pluginLogoMap={mockPluginLogoMap}
      />
      <div className="text-muted-foreground text-sm">
        Selected: {selected.length === 0 ? 'None' : selected.join(', ')}
      </div>
    </div>
  );
};

export const MultipleSelection: Story = {
  render: () => <MultipleSelectionComponent />,
};

const WithSearchComponent = () => {
  const [selected, setSelected] = React.useState<string[]>([]);

  return (
    <div className="flex flex-col gap-4">
      <DatasourceSelector
        selectedDatasources={selected}
        onSelectionChange={setSelected}
        datasources={mockDatasources}
        pluginLogoMap={mockPluginLogoMap}
        searchPlaceholder="Type to search datasources..."
      />
      <div className="text-muted-foreground text-sm">
        Selected: {selected.length === 0 ? 'None' : selected.join(', ')}
      </div>
      <p className="text-muted-foreground text-xs">
        Try searching for &quot;PostgreSQL&quot; or &quot;MySQL&quot; to see the
        search in action.
      </p>
    </div>
  );
};

export const WithSearch: Story = {
  render: () => <WithSearchComponent />,
};

const LoadingComponent = () => {
  const [selected, setSelected] = React.useState<string[]>([]);

  return (
    <div className="flex items-center gap-4">
      <DatasourceSelector
        selectedDatasources={selected}
        onSelectionChange={setSelected}
        datasources={[]}
        pluginLogoMap={new Map()}
        isLoading={true}
      />
      <div className="text-muted-foreground text-sm">In-progress state…</div>
    </div>
  );
};

export const Loading: Story = {
  render: () => <LoadingComponent />,
};

const ManyDatasourcesComponent = () => {
  const [selected, setSelected] = React.useState<string[]>([]);

  const manyDatasources = React.useMemo(() => {
    return Array.from({ length: 25 }, (_, i) => ({
      id: `ds-${i + 1}`,
      name: `Database ${i + 1}`,
      slug: `database-${i + 1}`,
      datasource_provider: `provider-${(i % 5) + 1}`,
    }));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <DatasourceSelector
        selectedDatasources={selected}
        onSelectionChange={setSelected}
        datasources={manyDatasources}
        pluginLogoMap={mockPluginLogoMap}
      />
      <div className="text-muted-foreground text-sm">
        Selected: {selected.length === 0 ? 'None' : selected.join(', ')}
      </div>
      <p className="text-muted-foreground text-xs">
        This demonstrates the component with 25 datasources. Only the first 10
        are shown in the list.
      </p>
    </div>
  );
};

export const ManyDatasources: Story = {
  render: () => <ManyDatasourcesComponent />,
};

const EmptyDatasourcesComponent = () => {
  const [selected, setSelected] = React.useState<string[]>([]);

  return (
    <div className="flex items-center gap-4">
      <DatasourceSelector
        selectedDatasources={selected}
        onSelectionChange={setSelected}
        datasources={[]}
        pluginLogoMap={new Map()}
        isLoading={false}
      />
      <div className="text-muted-foreground text-sm">
        No datasources available
      </div>
    </div>
  );
};

export const EmptyDatasources: Story = {
  render: () => <EmptyDatasourcesComponent />,
};
