'use client';

import { useContext, useId, useState } from 'react';

import { NavLink, useLocation } from 'react-router';

import { cva } from 'class-variance-authority';
import { ChevronDown } from 'lucide-react';
import { z } from 'zod/v3';

import { cn, isRouteActive } from '../lib/utils';
import { Button } from '../shadcn/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../shadcn/tooltip';
import { SidebarContext } from './context/sidebar.context';
import { If } from './if';
import type { NavigationConfigSchema } from './navigation-config.schema';
import { Trans } from './trans';

export type SidebarConfig = z.infer<typeof NavigationConfigSchema>;

export { SidebarContext };

/**
 * @deprecated
 * This component is deprecated and will be removed in a future version.
 * Please use the Shadcn Sidebar component instead.
 */
export function Sidebar(props: {
  collapsed?: boolean;
  expandOnHover?: boolean;
  className?: string;
  children:
    | React.ReactNode
    | ((props: {
        collapsed: boolean;
        setCollapsed: (collapsed: boolean) => void;
      }) => React.ReactNode);
}) {
  const [collapsed, setCollapsed] = useState(props.collapsed ?? false);
  const [isExpanded, setIsExpanded] = useState(false);

  const expandOnHover =
    props.expandOnHover ??
    process.env.NEXT_PUBLIC_EXPAND_SIDEBAR_ON_HOVER === 'true';

  const sidebarSizeClassName = getSidebarSizeClassName(collapsed, isExpanded);

  const className = getClassNameBuilder(
    cn(props.className ?? '', sidebarSizeClassName, {}),
  )();

  const containerClassName = cn(sidebarSizeClassName, 'bg-inherit', {
    'max-w-[4rem]': expandOnHover && isExpanded,
  });

  const ctx = { collapsed, setCollapsed };

  const onMouseEnter =
    props.collapsed && expandOnHover
      ? () => {
          setCollapsed(false);
          setIsExpanded(true);
        }
      : undefined;

  const onMouseLeave =
    props.collapsed && expandOnHover
      ? () => {
          if (!isRadixPopupOpen()) {
            setCollapsed(true);
            setIsExpanded(false);
          } else {
            onRadixPopupClose(() => {
              setCollapsed(true);
              setIsExpanded(false);
            });
          }
        }
      : undefined;

  return (
    <SidebarContext.Provider value={ctx}>
      <div
        className={containerClassName}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div aria-expanded={!collapsed} className={className}>
          {typeof props.children === 'function'
            ? props.children(ctx)
            : props.children}
        </div>
      </div>
    </SidebarContext.Provider>
  );
}

export function SidebarContent({
  children,
  className: customClassName,
}: React.PropsWithChildren<{
  className?: string;
}>) {
  const { collapsed } = useContext(SidebarContext);

  const className = cn(
    'flex w-full flex-col space-y-1.5 py-1',
    customClassName,
    {
      'px-4': !collapsed,
      'px-2': collapsed,
    },
  );

  return <div className={className}>{children}</div>;
}

function SidebarGroupWrapper({
  id,
  sidebarCollapsed,
  collapsible,
  isGroupCollapsed,
  setIsGroupCollapsed,
  label,
}: {
  id: string;
  sidebarCollapsed: boolean;
  collapsible: boolean;
  isGroupCollapsed: boolean;
  setIsGroupCollapsed: (isGroupCollapsed: boolean) => void;
  label: React.ReactNode;
}) {
  const className = cn(
    'px-container group flex items-center justify-between space-x-2.5',
    {
      'py-2.5': !sidebarCollapsed,
    },
  );

  if (collapsible) {
    return (
      <button
        aria-expanded={!isGroupCollapsed}
        aria-controls={id}
        onClick={() => setIsGroupCollapsed(!isGroupCollapsed)}
        className={className}
      >
        <span
          className={'text-muted-foreground text-xs font-semibold uppercase'}
        >
          {label}
        </span>

        <If condition={collapsible}>
          <ChevronDown
            className={cn(`h-3 transition duration-300`, {
              'rotate-180': !isGroupCollapsed,
            })}
          />
        </If>
      </button>
    );
  }

  if (sidebarCollapsed) {
    return null;
  }

  return (
    <div className={className}>
      <span className={'text-muted-foreground text-xs font-semibold uppercase'}>
        {label}
      </span>
    </div>
  );
}

export function SidebarGroup({
  label,
  collapsed = false,
  collapsible = true,
  children,
}: React.PropsWithChildren<{
  label: string | React.ReactNode;
  collapsible?: boolean;
  collapsed?: boolean;
}>) {
  const { collapsed: sidebarCollapsed } = useContext(SidebarContext);
  const [isGroupCollapsed, setIsGroupCollapsed] = useState(collapsed);
  const id = useId();

  return (
    <div
      className={cn('flex flex-col', {
        'gap-y-2 py-1': !collapsed,
      })}
    >
      <SidebarGroupWrapper
        id={id}
        sidebarCollapsed={sidebarCollapsed}
        collapsible={collapsible}
        isGroupCollapsed={isGroupCollapsed}
        setIsGroupCollapsed={setIsGroupCollapsed}
        label={label}
      />

      <If condition={collapsible ? !isGroupCollapsed : true}>
        <div id={id} className={'flex flex-col space-y-1.5'}>
          {children}
        </div>
      </If>
    </div>
  );
}

export function SidebarDivider() {
  return (
    <div className={'dark:border-dark-800 my-2 border-t border-gray-100'} />
  );
}

export function SidebarItem({
  end,
  path,
  children,
  Icon,
}: React.PropsWithChildren<{
  path: string;
  Icon: React.ReactNode;
  end?: boolean | ((path: string) => boolean);
}>) {
  const { collapsed } = useContext(SidebarContext);
  const currentRoute = useLocation().pathname;
  const active = isRouteActive(path, currentRoute, end ?? false);
  const variant = active ? 'secondary' : 'ghost';

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip disableHoverableContent>
        <TooltipTrigger asChild>
          <Button
            asChild
            className={cn(
              'active:bg-secondary/60 flex w-full text-sm shadow-none',
              {
                'justify-start space-x-2.5': !collapsed,
                'hover:bg-initial': active,
              },
            )}
            size={'sm'}
            variant={variant}
          >
            <NavLink to={path}>
              {Icon}
              <span
                className={cn('w-auto transition-opacity duration-300', {
                  'w-0 opacity-0': collapsed,
                })}
              >
                {children}
              </span>
            </NavLink>
          </Button>
        </TooltipTrigger>

        <If condition={collapsed}>
          <TooltipContent side={'right'} sideOffset={10}>
            {children}
          </TooltipContent>
        </If>
      </Tooltip>
    </TooltipProvider>
  );
}

function getClassNameBuilder(className: string) {
  return cva([
    cn(
      'group/sidebar transition-width fixed box-content flex h-screen w-2/12 flex-col bg-inherit backdrop-blur-xs duration-200',
      className,
    ),
  ]);
}

function getSidebarSizeClassName(collapsed: boolean, isExpanded: boolean) {
  return cn(['z-50 flex w-full flex-col'], {
    'dark:shadow-primary/20 lg:w-[17rem]': !collapsed,
    'lg:w-[4rem]': collapsed,
    shadow: isExpanded,
  });
}

function getRadixPopup() {
  return document.querySelector('[data-radix-popper-content-wrapper]');
}

function isRadixPopupOpen() {
  return getRadixPopup() !== null;
}

function onRadixPopupClose(callback: () => void) {
  const element = getRadixPopup();

  if (element) {
    const observer = new MutationObserver(() => {
      if (!getRadixPopup()) {
        callback();

        observer.disconnect();
      }
    });

    observer.observe(element.parentElement!, {
      childList: true,
      subtree: true,
    });
  }
}

export function SidebarNavigation({
  config,
}: React.PropsWithChildren<{
  config: SidebarConfig;
}>) {
  return (
    <>
      {config.routes.map((item, index) => {
        if ('divider' in item) {
          return <SidebarDivider key={index} />;
        }

        if ('children' in item) {
          return (
            <SidebarGroup
              key={item.label}
              label={<Trans i18nKey={item.label} defaults={item.label} />}
              collapsible={item.collapsible}
              collapsed={item.collapsed}
            >
              {item.children.map((child) => {
                if ('collapsible' in child && child.collapsible) {
                  throw new Error(
                    'Collapsible groups are not supported in the old Sidebar. Please migrate to the new Sidebar.',
                  );
                }

                if ('path' in child) {
                  return (
                    <SidebarItem
                      key={child.path}
                      end={child.end}
                      path={child.path}
                      Icon={child.Icon}
                    >
                      <Trans i18nKey={child.label} defaults={child.label} />
                    </SidebarItem>
                  );
                }
              })}
            </SidebarGroup>
          );
        }
      })}
    </>
  );
}
