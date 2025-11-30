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
  route('api/notebooks', 'routes/api/notebook/get-all-notebooks.ts'),
  route('api/notebooks/:id', 'routes/api/notebook/notebook.ts'),
  route(
    'api/conversations',
    'routes/api/conversation/get-all-conversations.ts',
  ),
  route('api/conversations/:id', 'routes/api/conversation/conversation.ts'),
  route('api/messages', 'routes/api/conversation/get-messages.ts'),
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
  route('prj/:slug/ds', 'routes/project/datasources/index.tsx'),
  route('prj/:slug/ds/new', 'routes/project/datasources/sources.tsx'),
  route('prj/:slug/ds/:id/new', 'routes/project/datasources/new.tsx'),
  route('ds/:slug', 'routes/project/datasources/view.tsx'),
  route('prj/:slug/playground', 'routes/project/playground.tsx'),
  route('prj/:slug/c', 'routes/project/conversation/index.tsx'),
  route('c/:slug', 'routes/project/conversation/conversation.tsx'),
]);

export default [
  ...rootRoutes,
  ...apiRoutes,
  appRoutes,
  organisationsLayout,
  orgRoutes,
  projectLayout,
] satisfies RouteConfig;
