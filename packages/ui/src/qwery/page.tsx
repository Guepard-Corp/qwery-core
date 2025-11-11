import * as React from 'react';

import { cn } from '../lib/utils/cn';

type PageProps = React.PropsWithChildren<{
  contentContainerClassName?: string;
  className?: string;
  sticky?: boolean;
}>;

export function Page(props: PageProps) {
  return <PageWithHeaderSidebar {...props} />;
}

function PageWithHeaderSidebar(props: PageProps) {
  const { Navigation, Children, MobileNavigation, TopNavigation, Footer } =
    getSlotsFromPage(props);

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden">
      {/* TopBar */}
      <div
        className={cn(
          'bg-sidebar dark:border-border relative flex h-14 w-full shrink-0 items-center justify-between border-b px-4',
          props.sticky === false
            ? ''
            : 'bg-sidebar sticky top-0 z-[100] backdrop-blur-md',
        )}
      >
        {/* Desktop Navigation */}
        <div className="hidden w-full flex-1 items-center space-x-8 lg:flex">
          {TopNavigation}
        </div>
        {/* Mobile Navigation */}
        {MobileNavigation}
      </div>

      {/* Layout below TopBar: Sidebar + Content */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Sidebar on the left */}
        {/* <div className="hidden lg:flex w-64 flex-col border-r bg-sidebar"> */}
        {Navigation}
        {/* </div> */}
        {/* Scrollable Main Content */}
        <div
          className={cn(
            'bg-background relative flex flex-1 flex-col overflow-hidden',
            props.contentContainerClassName,
          )}
        >
          <div className="flex-1 overflow-y-auto">
            <div className="flex w-full flex-col lg:rounded-lg">{Children}</div>
          </div>
          {Footer}
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
  return <div className={'hidden lg:flex'}>{props.children}</div>;
}

export function PageTopNavigation(props: React.PropsWithChildren) {
  return <div className={'hidden flex-1 lg:flex'}>{props.children}</div>;
}

export function PageFooter(props: React.PropsWithChildren) {
  return <div className={'shrink-0'}>{props.children}</div>;
}

export function PageBody(
  props: React.PropsWithChildren<{
    className?: string;
    variant?: 'default' | 'noPadding' | 'fullscreen';
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
    },
  );
}
