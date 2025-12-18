import { useLocation, Link } from 'react-router';
import { useSidebar } from '../shadcn/sidebar';
import { SidebarConfig } from './sidebar';
import {
  SidebarSeparator,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarMenuAction,
} from '../shadcn/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../shadcn/collapsible';
import { If } from './if';
import { cn, isRouteActive } from '../lib/utils';
import { Trans } from './trans';
import { ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

type CollapsibleOverride = {
  collapsible?: boolean;
  collapsed?: boolean;
};

type CollapsibleOverridesMap = Record<string, CollapsibleOverride>;

function resolveCollapsibleState(
  label: string,
  overrides?: CollapsibleOverridesMap,
  fallback?: CollapsibleOverride,
) {
  const override = overrides?.[label];

  return {
    collapsible: override?.collapsible ?? fallback?.collapsible ?? false,
    collapsed: override?.collapsed ?? fallback?.collapsed ?? false,
  };
}

function SidebarLabelText({
  label,
  suffix,
  truncate,
  title,
  className,
}: {
  label: string;
  suffix?: string;
  truncate?: boolean;
  title?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const translatedLabel = useMemo(
    () => t(label, { defaultValue: label }),
    [label, t],
  );
  const translatedTitle = useMemo(
    () =>
      title
        ? t(title, { defaultValue: title })
        : truncate
          ? translatedLabel
          : undefined,
    [title, truncate, translatedLabel, t],
  );

  return (
    <span
      className={cn(
        'flex min-w-0 items-center gap-1',
        truncate && 'overflow-hidden',
        className,
      )}
      title={translatedTitle}
    >
      <span className={cn('min-w-0', truncate && 'truncate')}>
        <Trans i18nKey={label} defaults={label} />
      </span>
      {suffix ? (
        <span className="text-muted-foreground shrink-0 text-xs font-normal whitespace-nowrap">
          {suffix}
        </span>
      ) : null}
    </span>
  );
}

export function SidebarNavigation({
  config,
  collapsibleOverrides,
}: React.PropsWithChildren<{
  config: SidebarConfig;
  collapsibleOverrides?: CollapsibleOverridesMap;
}>) {
  const currentPath = useLocation().pathname ?? '';
  const { state } = useSidebar();
  const { t } = useTranslation();
  const isCollapsed = state === 'collapsed';
  const translateKey = useCallback(
    (key?: string) => {
      if (!key) {
        return undefined;
      }
      return t(key, { defaultValue: key });
    },
    [t],
  );

  const [persistedState, setPersistedState] = useState<Record<string, boolean>>(
    {},
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const raw = window.localStorage.getItem('sidebar:collapsible-state');
      const parsed = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => setPersistedState(parsed), 0);
    } catch {
      setTimeout(() => setPersistedState({}), 0);
    }
  }, []);

  const persistState = useCallback((label: string, open: boolean) => {
    setPersistedState((prev) => {
      const next = { ...prev, [label]: open };
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(
            'sidebar:collapsible-state',
            JSON.stringify(next),
          );
        } catch {
          // Ignore storage failures
        }
      }
      return next;
    });
  }, []);

  return (
    <>
      {config.routes.map((item, index) => {
        const isLast = index === config.routes.length - 1;

        if ('divider' in item) {
          return <SidebarSeparator key={`divider-${index}`} />;
        }

        if ('children' in item) {
          const childHasActivePath = (
            child: (typeof item.children)[number],
          ): boolean => {
            if ('path' in child) {
              return isRouteActive(child.path, currentPath, child.end);
            }
            if ('children' in child && Array.isArray(child.children)) {
              return child.children.some(
                (subChild: (typeof child.children)[number]) =>
                  isRouteActive(subChild.path, currentPath, subChild.end),
              );
            }
            return false;
          };

          const groupState = resolveCollapsibleState(
            item.label,
            collapsibleOverrides,
            {
              collapsible: item.collapsible,
              collapsed: item.collapsed,
            },
          );

          const hasActiveChild = item.children.some((child) =>
            childHasActivePath(child),
          );

          const groupKey = `group:${item.label}`;
          const initialGroupOpen =
            !groupState.collapsed || hasActiveChild || false;
          const resolvedGroupOpen =
            persistedState[groupKey] ?? initialGroupOpen;

          const Container = (props: React.PropsWithChildren) => {
            if (groupState.collapsible) {
              return (
                <Collapsible
                  key={item.label}
                  open={resolvedGroupOpen}
                  className={'group/collapsible'}
                  onOpenChange={(open) => persistState(groupKey, open)}
                >
                  {props.children}
                </Collapsible>
              );
            }

            return props.children;
          };

          const ContentContainer = (props: React.PropsWithChildren) => {
            if (groupState.collapsible) {
              return <CollapsibleContent>{props.children}</CollapsibleContent>;
            }

            return props.children;
          };

          return (
            <Container key={`collapsible-${index}`}>
              <SidebarGroup key={item.label}>
                <div className="flex items-center gap-2">
                  <If
                    condition={groupState.collapsible}
                    fallback={
                      <SidebarGroupLabel className={cn('flex-1', { hidden: isCollapsed })}>
                        <SidebarLabelText
                          label={item.label}
                          suffix={item.labelSuffix}
                        />
                      </SidebarGroupLabel>
                    }
                  >
                    <SidebarGroupLabel
                      className={cn('flex-1', { hidden: isCollapsed })}
                      asChild
                    >
                      <CollapsibleTrigger className="flex items-center gap-1">
                        <SidebarLabelText
                          label={item.label}
                          suffix={item.labelSuffix}
                        />
                        <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                      </CollapsibleTrigger>
                    </SidebarGroupLabel>
                  </If>

                  <If condition={item.renderAction && !isCollapsed}>
                    <div className="flex items-center justify-center shrink-0">
                      {item.renderAction}
                    </div>
                  </If>
                </div>

                <SidebarGroupContent>
                  <SidebarMenu>
                    <ContentContainer>
                      {item.children.map((child, childIndex) => {
                        const hasNestedChildren =
                          'children' in child &&
                          Array.isArray(child.children) &&
                          child.children.length > 0;

                        const hasNestedActiveChild =
                          hasNestedChildren &&
                          child.children?.some((nestedChild) =>
                            isRouteActive(
                              nestedChild.path,
                              currentPath,
                              nestedChild.end,
                            ),
                          );

                        const childState = resolveCollapsibleState(
                          child.label,
                          collapsibleOverrides,
                          'collapsible' in child
                            ? {
                                collapsible: child.collapsible,
                                collapsed: child.collapsed,
                              }
                            : undefined,
                        );

                        const childKey = `child:${child.label}`;
                        const initialChildOpen =
                          hasNestedActiveChild || !childState.collapsed;
                        const resolvedChildOpen =
                          persistedState[childKey] ?? initialChildOpen;

                        const Container = (props: React.PropsWithChildren) => {
                          if (childState.collapsible && hasNestedChildren) {
                            return (
                              <Collapsible
                                key={child.label}
                                open={resolvedChildOpen}
                                className={'group/collapsible'}
                                onOpenChange={(open) =>
                                  persistState(childKey, open)
                                }
                              >
                                {props.children}
                              </Collapsible>
                            );
                          }

                          return props.children;
                        };

                        const ContentContainer = (
                          props: React.PropsWithChildren,
                        ) => {
                          if (childState.collapsible && hasNestedChildren) {
                            return (
                              <CollapsibleContent>
                                {props.children}
                              </CollapsibleContent>
                            );
                          }

                          return props.children;
                        };

                        const TriggerItem = () => {
                          const path = 'path' in child ? child.path : '';
                          const hasPath = Boolean(path);
                          const labelTitleKey =
                            'title' in child ? child.title : child.label;
                          const labelTitle = translateKey(labelTitleKey);
                          const iconNode = (
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center text-current">
                              {child.Icon}
                            </span>
                          );
                          const textNode = (
                            <span
                              className={cn(
                                'min-w-0 overflow-hidden text-left text-sm transition-[opacity,max-width] duration-200',
                                {
                                  'max-w-0 opacity-0': isCollapsed,
                                  'max-w-[160px] opacity-100': !isCollapsed,
                                },
                              )}
                              aria-hidden={isCollapsed}
                            >
                              <SidebarLabelText
                                label={child.label}
                                suffix={child.labelSuffix}
                              />
                            </span>
                          );
                          const rowClassName = cn(
                            'group/link flex min-w-0 items-center gap-2 transition-all duration-200',
                            {
                              'justify-center px-0': isCollapsed,
                              'justify-start': !isCollapsed,
                            },
                          );

                          if (childState.collapsible && hasNestedChildren) {
                            return (
                              <CollapsibleTrigger asChild>
                                <SidebarMenuButton
                                  tooltip={translateKey(child.label)}
                                  asChild={hasPath}
                                  isActive={
                                    hasPath
                                      ? isRouteActive(
                                          path,
                                          currentPath,
                                          'end' in child ? child.end : false,
                                        )
                                      : false
                                  }
                                >
                                  {hasPath ? (
                                    <Link
                                      prefetch={'intent'}
                                      className={rowClassName}
                                      to={path}
                                      title={labelTitle}
                                    >
                                      {iconNode}
                                      {textNode}
                                      <ChevronDown
                                        className={cn(
                                          'ml-auto size-4 transition-all duration-200 group-data-[state=open]/collapsible:rotate-180',
                                          {
                                            'opacity-0': isCollapsed,
                                          },
                                        )}
                                      />
                                    </Link>
                                  ) : (
                                    <div className={rowClassName}>
                                      {iconNode}
                                      {textNode}
                                      <ChevronDown
                                        className={cn(
                                          'ml-auto size-4 transition-all duration-200 group-data-[state=open]/collapsible:rotate-180',
                                          {
                                            'opacity-0': isCollapsed,
                                          },
                                        )}
                                      />
                                    </div>
                                  )}
                                </SidebarMenuButton>
                              </CollapsibleTrigger>
                            );
                          }

                          const end = 'end' in child ? child.end : false;
                          const isActive = hasPath
                            ? isRouteActive(path, currentPath, end)
                            : false;

                          return (
                            <SidebarMenuButton
                              asChild
                              isActive={isActive}
                              tooltip={translateKey(child.label)}
                            >
                              <Link
                                prefetch={'intent'}
                                className={rowClassName}
                                to={path}
                                title={labelTitle}
                              >
                                {iconNode}
                                {textNode}
                              </Link>
                            </SidebarMenuButton>
                          );
                        };

                        return (
                          <Container key={`group-${index}-${childIndex}`}>
                            <SidebarMenuItem>
                              <TriggerItem />

                              <ContentContainer>
                                <If condition={child.children}>
                                  {(children) => (
                                    <SidebarMenuSub
                                      className={cn('max-w-full min-w-0', {
                                        'mx-0 px-1.5': !isCollapsed,
                                      })}
                                    >
                                      {children.map((child) => {
                                        const isActive = isRouteActive(
                                          child.path,
                                          currentPath,
                                          child.end,
                                        );

                                        const linkClassName = cn(
                                          'group/link flex min-w-0 items-center gap-2 transition-all duration-200',
                                          {
                                            'justify-center px-0': isCollapsed,
                                            'justify-start px-1.5':
                                              !isCollapsed,
                                          },
                                        );

                                        const spanClassName = cn(
                                          'min-w-0 flex-1 overflow-hidden transition-[opacity,max-width] duration-200',
                                          {
                                            'max-w-0 opacity-0': isCollapsed,
                                            'max-w-[160px] opacity-100':
                                              !isCollapsed,
                                          },
                                        );

                                        return (
                                          <SidebarMenuSubItem
                                            key={child.path}
                                            className="max-w-full min-w-0"
                                          >
                                            <div className="group/sub-item flex max-w-full min-w-0 items-center gap-1">
                                              <SidebarMenuSubButton
                                                isActive={isActive}
                                                asChild
                                                className="min-w-0 flex-1"
                                              >
                                                <Link
                                                  prefetch={'intent'}
                                                  className={linkClassName}
                                                  to={child.path}
                                                  title={translateKey(
                                                    'title' in child
                                                      ? child.title
                                                      : child.label,
                                                  )}
                                                >
                                                  {child.Icon}

                                                  <span
                                                    className={spanClassName}
                                                  >
                                                    <SidebarLabelText
                                                      label={child.label}
                                                      suffix={child.labelSuffix}
                                                      truncate
                                                      title={
                                                        'title' in child
                                                          ? child.title
                                                          : child.label
                                                      }
                                                    />
                                                  </span>
                                                </Link>
                                              </SidebarMenuSubButton>
                                              <If
                                                condition={child.renderAction}
                                              >
                                                <div
                                                  className={cn(
                                                    'shrink-0 opacity-0 transition-opacity group-hover/sub-item:opacity-100',
                                                    {
                                                      'hidden group-data-[collapsible=icon]/collapsible:hidden':
                                                        isCollapsed,
                                                    },
                                                  )}
                                                  onClick={(e) =>
                                                    e.stopPropagation()
                                                  }
                                                >
                                                  {child.renderAction}
                                                </div>
                                              </If>
                                            </div>
                                          </SidebarMenuSubItem>
                                        );
                                      })}
                                    </SidebarMenuSub>
                                  )}
                                </If>
                              </ContentContainer>

                              <If
                                condition={child.renderAction && !isCollapsed}
                              >
                                <SidebarMenuAction asChild>
                                  {child.renderAction}
                                </SidebarMenuAction>
                              </If>
                            </SidebarMenuItem>
                          </Container>
                        );
                      })}
                    </ContentContainer>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              <If condition={isCollapsed && !isLast}>
                <SidebarSeparator />
              </If>
            </Container>
          );
        }
      })}
    </>
  );
}
