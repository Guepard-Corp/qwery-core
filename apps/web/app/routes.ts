import {
  type RouteConfig,
  index,
  layout,
  route,
} from '@react-router/dev/routes';

const rootRoutes = [
  route('version', 'routes/version.ts'),
  route('healthcheck', 'routes/healthcheck.ts'),
  route('qwery/*', 'routes/ingest.$.ts'),
];

// API routes kept in web (driver, extensions, notebook prompt/query); repository traffic goes to apps/server
const apiRoutes = [route('api/init', 'routes/api/init.ts')];

const appRoutes = layout('routes/layout/layout.tsx', [
  index('routes/index.tsx'),
]);

const organisationsLayout = layout('routes/organizations/layout.tsx', [
  route('organizations', 'routes/organizations/index.tsx'),
]);

const orgRoutes = layout('routes/organization/layout.tsx', [
  route('org/:slug', 'routes/organization/index.tsx'),
]);

const projectLayout = layout('routes/project/layout.tsx', [
  route('prj/:slug', 'routes/project/index.tsx'),
  route('notebook/:slug', 'routes/project/notebook.tsx'),
  route('prj/:slug/notebooks', 'routes/project/notebooks/index.tsx'),
  route('prj/:slug/ds', 'routes/project/datasources/index.tsx'),
  route('prj/:slug/ds/new', 'routes/project/datasources/sources.tsx'),
  route('prj/:slug/ds/:id/new', 'routes/project/datasources/new.tsx'),
  route('prj/:slug/playground', 'routes/project/playground.tsx'),
  route('prj/:slug/c', 'routes/project/conversation/index.tsx'),
  route('c/:slug', 'routes/project/conversation/conversation.tsx'),
]);

const datasourceLayout = layout('routes/datasource/layout.tsx', [
  route('ds/:slug', 'routes/datasource/index.tsx'),
  route('ds/:slug/tables', 'routes/datasource/tables.tsx'),
  route('ds/:slug/tables/:id', 'routes/datasource/table.tsx'),
  route('ds/:slug/schema', 'routes/datasource/schema.tsx'),
  route('ds/:slug/settings', 'routes/datasource/settings.tsx'),
]);

// Catch-all route for unmatched paths (must be last)
const catchAllRoute = route('*', 'routes/404.tsx');

export default [
  ...rootRoutes,
  ...apiRoutes,
  appRoutes,
  organisationsLayout,
  orgRoutes,
  projectLayout,
  datasourceLayout,
  catchAllRoute,
] satisfies RouteConfig;
