import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

const rootRoutes = [
  route('version', "../../web/app/routes/version.tsx"),
];

const appRoutes = layout("../../web/app/routes/layout/layout.tsx", [
  index("../../web/app/routes/index.tsx"),
]);

const organisationsLayout = layout("../../web/app/routes/organizations/layout.tsx", [
  route('organizations', "../../web/app/routes/organizations/index.tsx"),
]);

const orgRoutes = layout("../../web/app/routes/organization/layout.tsx", [
  route('org/:slug', "../../web/app/routes/organization/index.tsx"),
]);

const projectLayout = layout("../../web/app/routes/project/layout.tsx", [
  route('prj/:slug', "../../web/app/routes/project/index.tsx"),
  route('notebook/:slug', "../../web/app/routes/project/notebook.tsx"),
  route('prj/:slug/notebooks', "../../web/app/routes/project/notebooks/index.tsx"),
  route('prj/:slug/ds', "../../web/app/routes/project/datasources/index.tsx"),
  route('prj/:slug/ds/new', "../../web/app/routes/project/datasources/sources.tsx"),
  route('prj/:slug/ds/:id/new', "../../web/app/routes/project/datasources/new.tsx"),
  route('prj/:slug/playground', "../../web/app/routes/project/playground.tsx"),
  route('prj/:slug/c', "../../web/app/routes/project/conversation/index.tsx"),
  route('c/:slug', "../../web/app/routes/project/conversation/conversation.tsx"),
]);

const datasourceLayout = layout("../../web/app/routes/datasource/layout.tsx", [
  route('ds/:slug', "../../web/app/routes/datasource/index.tsx"),
  route('ds/:slug/tables', "../../web/app/routes/datasource/tables.tsx"),
  route('ds/:slug/tables/:id', "../../web/app/routes/datasource/table.tsx"),
  route('ds/:slug/schema', "../../web/app/routes/datasource/schema.tsx"),
  route('ds/:slug/settings', "../../web/app/routes/datasource/settings.tsx"),
]);

export default [
  ...rootRoutes,
  appRoutes,
  organisationsLayout,
  orgRoutes,
  projectLayout,
  datasourceLayout,
] satisfies RouteConfig;
