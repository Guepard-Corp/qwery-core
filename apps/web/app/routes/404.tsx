import { Link } from 'react-router';

import { ArrowLeft } from 'lucide-react';

import { Button } from '@qwery/ui/button';
import { Heading } from '@qwery/ui/heading';
import { Trans } from '@qwery/ui/trans';

import pathsConfig from '~/config/paths.config';
import { pageTitle } from '~/lib/page-title';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import type { Route } from '~/types/app/routes/+types/404';

export async function loader({ request }: Route.LoaderArgs) {
  const i18n = await createI18nServerInstance(request);
  const title = i18n.t('common:pageNotFound');

  return {
    title,
  };
}

export const meta = ({ data }: Route.MetaArgs) => {
  return [
    {
      title: pageTitle(data?.title ?? 'Not found'),
    },
  ];
};

export default function NotFoundPage() {
  return (
    <div className={'flex h-full min-h-0 flex-1 flex-col'}>
      <div
        className={
          'container m-auto flex w-full flex-1 flex-col items-center justify-center'
        }
      >
        <div className={'flex flex-col items-center space-y-16'}>
          <div>
            <h1 className={'font-heading text-9xl font-extrabold'}>
              <Trans i18nKey={'common:pageNotFoundHeading'} />
            </h1>
          </div>

          <div className={'flex flex-col items-center space-y-8'}>
            <div className={'flex flex-col items-center space-y-2.5'}>
              <div>
                <Heading level={1}>
                  <Trans i18nKey={'common:pageNotFound'} />
                </Heading>
              </div>

              <p className={'text-muted-foreground'}>
                <Trans i18nKey={'common:pageNotFoundSubHeading'} />
              </p>
            </div>

            <div>
              <Button variant={'outline'} asChild>
                <Link to={pathsConfig.app.home}>
                  <ArrowLeft className={'mr-2 h-4'} />

                  <Trans i18nKey={'common:goBack'} />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
