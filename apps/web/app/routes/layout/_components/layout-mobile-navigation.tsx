import { Link, useParams } from 'react-router';

import { LogOut, Menu } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@qwery/ui/dropdown-menu';
import { Trans } from '@qwery/ui/trans';

import { createNavigationConfig } from '../../../../config/qwery.navigation.config';

export function LayoutMobileNavigation() {
  const params = useParams();
  const project_id = params.id || params.slug || '';
  const navigationConfig = createNavigationConfig(project_id);
  const Links = navigationConfig.routes.flatMap((item, index) => {
    if ('children' in item) {
      return item.children
        .filter(
          (
            child,
          ): child is { path: string; label: string; Icon?: React.ReactNode } =>
            'path' in child && !!child.path,
        )
        .map((child) => {
          return (
            <DropdownLink
              key={child.path}
              Icon={child.Icon}
              path={child.path}
              label={child.label}
            />
          );
        });
    }

    if ('divider' in item) {
      return <DropdownMenuSeparator key={index} />;
    }

    return [];
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Menu className={'h-9'} />
      </DropdownMenuTrigger>

      <DropdownMenuContent sideOffset={10} className={'w-screen rounded-none'}>
        <DropdownMenuGroup>{Links}</DropdownMenuGroup>

        <DropdownMenuSeparator />

        <SignOutDropdownItem onSignOut={() => {}} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DropdownLink(
  props: React.PropsWithChildren<{
    path: string;
    label: string;
    Icon: React.ReactNode;
  }>,
) {
  return (
    <DropdownMenuItem asChild key={props.path}>
      <Link
        to={props.path}
        className={'flex h-12 w-full items-center space-x-4'}
      >
        {props.Icon}

        <span>
          <Trans i18nKey={props.label} defaults={props.label} />
        </span>
      </Link>
    </DropdownMenuItem>
  );
}

function SignOutDropdownItem(
  props: React.PropsWithChildren<{
    onSignOut: () => unknown;
  }>,
) {
  return (
    <DropdownMenuItem
      className={'flex h-12 w-full items-center space-x-4'}
      onClick={props.onSignOut}
    >
      <LogOut className={'h-6'} />

      <span>
        <Trans i18nKey={'common:signOut'} defaults={'Sign out'} />
      </span>
    </DropdownMenuItem>
  );
}
