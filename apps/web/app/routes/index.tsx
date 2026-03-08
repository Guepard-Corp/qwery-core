import { redirect } from 'react-router';

import pathsConfig from '~/config/paths.config';
import type { Route } from '~/types/app/routes/+types/index';

export const clientLoader = async (_args: Route.LoaderArgs) => {
  throw redirect(pathsConfig.app.organizations);
};
import { useNavigate } from 'react-router';
import { Skeleton } from '@qwery/ui/skeleton';
import { LoadingSkeleton } from '@qwery/ui/loading-skeleton';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from '@qwery/ui/shadcn-sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@qwery/ui/collapsible';
import { ChevronRight } from 'lucide-react';
import { LogoImage } from '~/components/app-logo';

import { useWorkspace } from '~/lib/context/workspace-context';
import { useGetProjectById } from '~/lib/queries/use-get-projects';

function SidebarSkeleton() {
  return (
    <Sidebar
      collapsible="none"
      className="w-(--sidebar-width,18rem) max-w-(--sidebar-width,18rem) min-w-0 border-r"
    >
      <SidebarContent className="overflow-hidden px-3">
        <div className="mt-2">
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="flex min-w-0 flex-col gap-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-8 w-full rounded-md"
                  data-sidebar="menu-skeleton"
                />
              ))}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="min-w-0 overflow-hidden py-0">
          <SidebarGroupContent>
            <Skeleton className="h-9 w-full rounded-md" />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="min-w-0 overflow-hidden py-0">
          <Collapsible defaultOpen>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="hover:bg-sidebar-accent -mx-2 cursor-pointer rounded-md px-2 py-1">
                <div className="flex w-full items-center justify-between">
                  <span>Recent chats</span>
                  <ChevronRight className="size-4 transition-transform duration-200" />
                </div>
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden data-[state=closed]:duration-200 data-[state=open]:duration-200">
              <SidebarGroupContent className="min-h-0">
                <LoadingSkeleton variant="sidebar" count={3} />
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        <SidebarGroup className="min-w-0 overflow-hidden py-0">
          <Collapsible defaultOpen>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="hover:bg-sidebar-accent -mx-2 cursor-pointer rounded-md px-2 py-1">
                <div className="flex w-full items-center justify-between">
                  <span>Recent notebooks</span>
                  <ChevronRight className="size-4 transition-transform duration-200" />
                </div>
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden data-[state=closed]:duration-200 data-[state=open]:duration-200">
              <SidebarGroupContent className="min-h-0">
                <LoadingSkeleton variant="sidebar" count={3} />
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

function DashboardSkeleton() {
  return (
    <div className="bg-background flex h-full min-w-0 flex-1 justify-center overflow-y-auto">
      <main className="w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-20">
        {/* HERO SECTION */}
        <section className="mb-16 space-y-5 text-center">
          {/* Qwery Logo & Brand */}
          <div className="mb-8 flex flex-col items-center gap-4">
            <LogoImage size="2xl" _width={256} />
            <Skeleton className="h-10 w-32" />
          </div>

          <Skeleton className="mx-auto mb-4 h-12 w-96" />
          <Skeleton className="mx-auto h-6 w-80" />
        </section>

        {/* PRIMARY CHAT INPUT */}
        <section className="mb-12">
          <div className="bg-card border-border/60 rounded-lg border p-4 shadow-sm">
            <Skeleton className="mb-3 h-32 w-full" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>

          {/* Example prompts skeleton */}
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            <Skeleton className="h-8 w-32 rounded-md" />
            <Skeleton className="h-8 w-40 rounded-md" />
            <Skeleton className="h-8 w-36 rounded-md" />
          </div>
        </section>

        {/* DIVIDER */}
        <div className="relative my-12">
          <div className="absolute inset-0 flex items-center">
            <div className="border-border/40 w-full border-t"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background text-muted-foreground/70 px-3">
              Quick Actions
            </span>
          </div>
        </div>

        {/* ACTION CARDS */}
        <section className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="bg-card rounded-2xl border p-8">
            <div className="mb-3 flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-6 w-40" />
            </div>
            <Skeleton className="mb-6 h-16 w-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="bg-card rounded-2xl border p-8">
            <div className="mb-3 flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-6 w-40" />
            </div>
            <Skeleton className="mb-6 h-16 w-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        </section>

        {/* DIVIDER */}
        <div className="relative my-12">
          <div className="absolute inset-0 flex items-center">
            <div className="border-border/40 w-full border-t"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background text-muted-foreground/70 px-3">
              Sample Data
            </span>
          </div>
        </div>

        {/* PLAYGROUND SECTION */}
        <section className="space-y-4 pb-12">
          <div className="bg-card overflow-hidden rounded-lg border p-8">
            <Skeleton className="h-24 w-full" />
          </div>
        </section>
      </main>
    </div>
  );
}

export default function IndexPage() {
  return null;
}
