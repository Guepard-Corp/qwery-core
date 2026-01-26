import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider } from 'next-themes';
import { MemoryRouter } from 'react-router';
import {
  QweryBreadcrumb,
  GenericBreadcrumb,
  type BreadcrumbNodeItem,
  type BreadcrumbNodeConfig,
} from './qwery-breadcrumb';

const meta: Meta<typeof QweryBreadcrumb> = {
  title: 'Qwery/QweryBreadcrumb',
  component: QweryBreadcrumb,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <ThemeProvider attribute="class" enableSystem defaultTheme="system">
        <MemoryRouter initialEntries={['/prj/main-project']}>
          <div className="p-8">
            <Story />
          </div>
        </MemoryRouter>
      </ThemeProvider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof QweryBreadcrumb>;

const mockOrganizations: BreadcrumbNodeItem[] = [
  { id: 'org-1', name: 'Acme Corporation', slug: 'acme-corp' },
  { id: 'org-2', name: 'Tech Startup Inc', slug: 'tech-startup' },
  { id: 'org-3', name: 'Global Enterprises', slug: 'global-enterprises' },
  { id: 'org-4', name: 'Small Business Co', slug: 'small-business' },
  { id: 'org-5', name: 'Mega Corp', slug: 'mega-corp' },
  { id: 'org-6', name: 'Another Organization', slug: 'another-org' },
];

const mockProjects: BreadcrumbNodeItem[] = [
  { id: 'project-1', name: 'Main Project', slug: 'main-project' },
  { id: 'project-2', name: 'Side Project', slug: 'side-project' },
  { id: 'project-3', name: 'Test Project', slug: 'test-project' },
  { id: 'project-4', name: 'Demo Project', slug: 'demo-project' },
  { id: 'project-5', name: 'Production Project', slug: 'production-project' },
  { id: 'project-6', name: 'Development Project', slug: 'development-project' },
];

const mockDatasources: BreadcrumbNodeItem[] = [
  { id: 'ds-1', name: 'PostgreSQL Database', slug: 'postgres-db' },
  { id: 'ds-2', name: 'MySQL Database', slug: 'mysql-db' },
  { id: 'ds-3', name: 'SQLite Database', slug: 'sqlite-db' },
  { id: 'ds-4', name: 'MongoDB Database', slug: 'mongodb-db' },
  { id: 'ds-5', name: 'Redis Cache', slug: 'redis-cache' },
  { id: 'ds-6', name: 'Elasticsearch', slug: 'elasticsearch' },
];

const mockNotebooks: BreadcrumbNodeItem[] = [
  { id: 'nb-1', name: 'Analysis Notebook', slug: 'analysis-notebook' },
  { id: 'nb-2', name: 'Exploration Notebook', slug: 'exploration-notebook' },
  { id: 'nb-3', name: 'Reporting Notebook', slug: 'reporting-notebook' },
  { id: 'nb-4', name: 'Testing Notebook', slug: 'testing-notebook' },
  { id: 'nb-5', name: 'Production Notebook', slug: 'production-notebook' },
  { id: 'nb-6', name: 'Development Notebook', slug: 'development-notebook' },
];

const defaultHandlers = {
  onOrganizationSelect: (org: BreadcrumbNodeItem) => {
    console.log('Selected organization:', org);
  },
  onProjectSelect: (project: BreadcrumbNodeItem) => {
    console.log('Selected project:', project);
  },
  onDatasourceSelect: (datasource: BreadcrumbNodeItem) => {
    console.log('Selected datasource:', datasource);
  },
  onNotebookSelect: (notebook: BreadcrumbNodeItem) => {
    console.log('Selected notebook:', notebook);
  },
  onViewAllOrgs: () => console.log('View all organizations'),
  onViewAllProjects: () => console.log('View all projects'),
  onViewAllDatasources: () => console.log('View all datasources'),
  onViewAllNotebooks: () => console.log('View all notebooks'),
  onNewOrg: () => console.log('New organization'),
  onNewProject: () => console.log('New project'),
  onNewDatasource: () => console.log('New datasource'),
  onNewNotebook: () => console.log('New notebook'),
};

export const Default: Story = {
  args: {
    organization: {
      items: mockOrganizations,
      isLoading: false,
      current: mockOrganizations[0] ?? null,
    },
    project: {
      items: mockProjects,
      isLoading: false,
      current: mockProjects[0] ?? null,
    },
    ...defaultHandlers,
  },
};

export const WithDatasource: Story = {
  args: {
    organization: {
      items: mockOrganizations,
      isLoading: false,
      current: mockOrganizations[0] ?? null,
    },
    project: {
      items: mockProjects,
      isLoading: false,
      current: mockProjects[0] ?? null,
    },
    object: {
      items: mockDatasources,
      isLoading: false,
      current: mockDatasources[0] ?? null,
      type: 'datasource',
    },
    ...defaultHandlers,
  },
};

export const WithNotebook: Story = {
  args: {
    organization: {
      items: mockOrganizations,
      isLoading: false,
      current: mockOrganizations[0] ?? null,
    },
    project: {
      items: mockProjects,
      isLoading: false,
      current: mockProjects[0] ?? null,
    },
    object: {
      items: mockNotebooks,
      isLoading: false,
      current: mockNotebooks[0] ?? null,
      type: 'notebook',
    },
    ...defaultHandlers,
  },
};

export const Loading: Story = {
  args: {
    organization: {
      items: [],
      isLoading: true,
      current: null,
    },
    project: {
      items: [],
      isLoading: true,
      current: null,
    },
    ...defaultHandlers,
  },
};

export const OrganizationOnly: Story = {
  args: {
    organization: {
      items: mockOrganizations,
      isLoading: false,
      current: mockOrganizations[0] ?? null,
    },
    ...defaultHandlers,
  },
};

// Generic Breadcrumb Stories - demonstrating the modular design
const GenericMeta: Meta<typeof GenericBreadcrumb> = {
  title: 'Qwery/GenericBreadcrumb',
  component: GenericBreadcrumb,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <ThemeProvider attribute="class" enableSystem defaultTheme="system">
        <MemoryRouter initialEntries={['/']}>
          <div className="p-8">
            <Story />
          </div>
        </MemoryRouter>
      </ThemeProvider>
    ),
  ],
};

export const GenericTwoLevels: StoryObj<typeof GenericBreadcrumb> = {
  ...GenericMeta,
  render: () => {
    const nodes: BreadcrumbNodeConfig[] = [
      {
        items: [
          { id: '1', name: 'Category A', slug: 'cat-a' },
          { id: '2', name: 'Category B', slug: 'cat-b' },
        ],
        current: { id: '1', name: 'Category A', slug: 'cat-a' },
        labels: {
          search: 'Search categories...',
          viewAll: 'View all categories',
          new: 'New Category',
        },
        onSelect: (item) => console.log('Category:', item),
        onViewAll: () => console.log('View all'),
        onNew: () => console.log('New'),
      },
      {
        items: [
          { id: '1', name: 'Item 1', slug: 'item-1' },
          { id: '2', name: 'Item 2', slug: 'item-2' },
        ],
        current: { id: '1', name: 'Item 1', slug: 'item-1' },
        labels: {
          search: 'Search items...',
          viewAll: 'View all items',
          new: 'New Item',
        },
        onSelect: (item) => console.log('Item:', item),
      },
    ];
    return <GenericBreadcrumb nodes={nodes} />;
  },
};

export const GenericFourLevels: StoryObj<typeof GenericBreadcrumb> = {
  ...GenericMeta,
  render: () => {
    const nodes: BreadcrumbNodeConfig[] = [
      {
        items: [{ id: '1', name: 'Root', slug: 'root' }],
        current: { id: '1', name: 'Root', slug: 'root' },
        labels: { search: 'Search...', viewAll: 'View all', new: 'New' },
        onSelect: () => {},
      },
      {
        items: [{ id: '1', name: 'Level 1', slug: 'l1' }],
        current: { id: '1', name: 'Level 1', slug: 'l1' },
        labels: { search: 'Search...', viewAll: 'View all', new: 'New' },
        onSelect: () => {},
      },
      {
        items: [{ id: '1', name: 'Level 2', slug: 'l2' }],
        current: { id: '1', name: 'Level 2', slug: 'l2' },
        labels: { search: 'Search...', viewAll: 'View all', new: 'New' },
        onSelect: () => {},
      },
      {
        items: [{ id: '1', name: 'Level 3', slug: 'l3' }],
        current: { id: '1', name: 'Level 3', slug: 'l3' },
        labels: { search: 'Search...', viewAll: 'View all', new: 'New' },
        onSelect: () => {},
      },
    ];
    return <GenericBreadcrumb nodes={nodes} />;
  },
};
