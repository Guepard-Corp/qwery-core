import { redirect } from 'react-router';

import pathsConfig from '~/config/paths.config';
import type { Route } from '~/types/app/routes/+types/index';

export const clientLoader = async (_args: Route.LoaderArgs) => {
  throw redirect(pathsConfig.app.organizations);
};

export default function IndexPage() {
  return null;
}
