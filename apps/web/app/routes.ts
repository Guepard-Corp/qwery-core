import {
  type RouteConfig,
  index,
  layout,
  route,
} from '@react-router/dev/routes';

const rootRoutes = [
  route('version', 'routes/version.ts'),
  route('healthcheck', 'routes/healthcheck.ts'),
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
  route('prj/:slug/notebook', 'routes/project/notebook.tsx'),
  route('prj/:slug/ds', 'routes/project/datasources/index.tsx'),
  route('prj/:slug/ds/new', 'routes/project/datasources/sources.tsx'),
  route('prj/:slug/ds/:id/new', 'routes/project/datasources/new.tsx'),
  route('ds/:slug', 'routes/project/datasources/view.tsx'),
  route('prj/:slug/playground', 'routes/project/playground.tsx'),
]);

export default [
  ...rootRoutes,
  appRoutes,
  organisationsLayout,
  orgRoutes,
  projectLayout,
] satisfies RouteConfig;
