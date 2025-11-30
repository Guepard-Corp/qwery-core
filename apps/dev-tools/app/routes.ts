import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/index.tsx'),
  route('state-machine/:id?', 'routes/state-machine.tsx'),
] satisfies RouteConfig;
