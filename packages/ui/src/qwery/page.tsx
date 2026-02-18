import * as React from 'react';

import { cn } from '../lib/utils/cn';
import {
  ResizableContent,
  type ResizableContentRef,
} from './resizable-content';

// Re-export for external use
export type { ResizableContentRef };

export type PageBodyVariant = 'default' | 'noPadding' | 'fullscreen';

type PageProps = React.PropsWithChildren<{
  contentContainerClassName?: string;
  className?: string;
  sticky?: boolean;
  agentSidebarOpen?: boolean;
  agentSidebarRef?: React.Ref<ResizableContentRef>;
  agentSidebarOnOpenChange?: (open: boolean) => void;
}>;

export function Page(props: PageProps) {
  return <PageWithHeaderSidebar {...props} />;
}

function PageWithHeaderSidebar(props: PageProps) {
  const {
    Navigation,
    Children,
    MobileNavigation,
    TopNavigation,
    Footer: _Footer,
    AgentSidebar,
  } = getSlotsFromPage(props);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden overflow-x-hidden">
      {/* Topbar */}
      <div
        className={cn(
          'bg-sidebar dark:border-border relative flex h-14 w-full shrink-0 items-center justify-between overflow-x-hidden border-b px-4',
          props.sticky === false
            ? ''
            : 'bg-sidebar sticky top-0 z-[100] backdrop-blur-md',
        )}
      >
        {/* Desktop Navigation */}
        <div className="hidden w-full min-w-0 flex-1 items-center space-x-8 overflow-x-hidden lg:flex">
          {TopNavigation}
        </div>
        {/* Mobile Navigation */}
        {MobileNavigation}
      </div>

      {/* Sidebar + Content */}
      <div className="flex min-h-0 flex-1 overflow-hidden overflow-x-hidden">
        {Navigation}
        {/* Main Content */}
        <div className="bg-background relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden overflow-x-hidden">
          <div className="h-full min-h-0 max-w-full min-w-0 flex-1 overflow-x-hidden">
            {/* eslint-disable react-hooks/refs -- These are props being passed, not refs being accessed during render */}
            <ResizableContent
              ref={props.agentSidebarRef}
              Content={Children}
              AgentSidebar={AgentSidebar}
              open={props.agentSidebarOpen}
              onOpenChange={props.agentSidebarOnOpenChange}
            />
            {/* eslint-enable react-hooks/refs */}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PageMobileNavigation(
  props: React.PropsWithChildren<{
    className?: string;
  }>,
) {
  return (
    <div
      className={cn('flex w-full items-center py-2 lg:hidden', props.className)}
    >
      {props.children}
    </div>
  );
}

export function PageNavigation(props: React.PropsWithChildren) {
  if (!props.children) {
    return null;
  }

  return <>{props.children}</>;
}

export function PageTopNavigation(props: React.PropsWithChildren) {
  return <div className={'hidden flex-1 lg:flex'}>{props.children}</div>;
}

export function PageFooter(props: React.PropsWithChildren) {
  return <div className={'shrink-0'}>{props.children}</div>;
}

export function AgentSidebar(props: React.PropsWithChildren) {
  return <>{props.children}</>;
}
export function PageBody(
  props: React.PropsWithChildren<{
    className?: string;
    variant?: PageBodyVariant;
  }>,
) {
  const className = cn(
    'flex w-full flex-1 flex-col',
    props.variant === 'fullscreen'
      ? 'h-full overflow-hidden'
      : props.variant !== 'noPadding' && 'px-4 py-4 lg:px-12 lg:py-4',
    props.className,
  );

  return <div className={className}>{props.children}</div>;
}

export function PageDescription(props: React.PropsWithChildren) {
  return (
    <div className={'h-6'}>
      <div className={'text-muted-foreground text-xs leading-none font-normal'}>
        {props.children}
      </div>
    </div>
  );
}

export function PageTitle(props: React.PropsWithChildren) {
  return (
    <h1
      className={
        'font-heading h-6 leading-none font-bold tracking-tight dark:text-white'
      }
    >
      {props.children}
    </h1>
  );
}

export function PageHeaderActions(props: React.PropsWithChildren) {
  return <div className={'flex items-center space-x-2'}>{props.children}</div>;
}

export function PageTopBar({
  children,
  className,
}: React.PropsWithChildren<{
  className?: string;
}>) {
  return (
    <div className={cn('flex w-full items-center justify-between', className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  children,
  title,
  description,
  className,
}: React.PropsWithChildren<{
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
}>) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-6 pt-6 lg:px-12 lg:pt-10',
        className,
      )}
    >
      <div className={'flex flex-col'}>
        <PageTitle>{title}</PageTitle>
        <PageDescription>{description}</PageDescription>
      </div>

      {children}
    </div>
  );
}

function getSlotsFromPage(props: React.PropsWithChildren) {
  return React.Children.toArray(props.children).reduce<{
    Children: React.ReactElement | null;
    Navigation: React.ReactElement | null;
    MobileNavigation: React.ReactElement | null;
    TopNavigation: React.ReactElement | null;
    Footer: React.ReactElement | null;
    AgentSidebar: React.ReactElement | null;
  }>(
    (acc, child) => {
      if (!React.isValidElement(child)) {
        return acc;
      }

      if (child.type === PageNavigation) {
        return {
          ...acc,
          Navigation: child,
        };
      }

      if (child.type === PageTopNavigation) {
        return {
          ...acc,
          TopNavigation: child,
        };
      }

      if (child.type === PageMobileNavigation) {
        return {
          ...acc,
          MobileNavigation: child,
        };
      }

      if (child.type === PageFooter) {
        return {
          ...acc,
          Footer: child,
        };
      }

      if (child.type === AgentSidebar) {
        return {
          ...acc,
          AgentSidebar: child,
        };
      }

      return {
        ...acc,
        Children: child,
      };
    },
    {
      Children: null,
      Navigation: null,
      MobileNavigation: null,
      TopNavigation: null,
      Footer: null,
      AgentSidebar: null,
    },
  );
}
