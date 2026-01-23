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

const apiRoutes = [
  route('api/chat/:slug', 'routes/api/chat.ts'),
  route(
    'api/organizations',
    'routes/api/organization/get-all-organizations.ts',
  ),
  route('api/organizations/:id', 'routes/api/organization/organization.ts'),
  route('api/projects', 'routes/api/project/get-all-projects.ts'),
  route('api/projects/:id', 'routes/api/project/project.ts'),
  route('api/datasources/:id?', 'routes/api/datasource/datasource.ts'),
  route('api/driver/command', 'routes/api/driver/command.ts'),
  route('api/extensions/registry', 'routes/api/extensions/registry.ts'),
  route('api/notebooks', 'routes/api/notebook/get-all-notebooks.ts'),
  route('api/notebooks/:id', 'routes/api/notebook/notebook.ts'),
  route(
    'api/conversations',
    'routes/api/conversation/get-all-conversations.ts',
  ),
  route('api/conversations/:id', 'routes/api/conversation/conversation.ts'),
  route(
    'api/conversations/project/:projectId',
    'routes/api/conversations/project/$projectId.ts',
  ),
  route('api/messages', 'routes/api/conversation/get-messages.ts'),
  route('api/usage', 'routes/api/usage/usage.ts'),
  route('api/notebook/prompt', 'routes/api/notebook/prompt.ts'),
  route('api/notebook/query', 'routes/api/notebook/query.ts'),
];

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
