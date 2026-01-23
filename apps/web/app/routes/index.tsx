import { useEffect } from 'react';

import { useNavigate } from 'react-router';
import { Skeleton } from '@qwery/ui/skeleton';
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
import { LogoImage } from '~/components/app-logo';

import { useWorkspace } from '~/lib/context/workspace-context';
import { useGetProjectById } from '~/lib/queries/use-get-projects';


function SidebarSkeleton() {
  return (
    <Sidebar collapsible="none" className="w-[18rem] min-w-[18rem] max-w-[18rem]">
      <SidebarContent className="p-4 overflow-hidden">
        {/* Navigation items skeleton */}
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="space-y-1">
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Search Bar skeleton */}
        <SidebarGroup>
          <SidebarGroupContent>
            <Skeleton className="h-9 w-full rounded-md" />
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Conversation History skeleton */}
        <SidebarGroup className="overflow-hidden min-w-0">
          <Collapsible open={true}>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent rounded-md px-2 py-1.5 my-1 -mx-2">
                <div className="flex items-center justify-between w-full">
                  <span>Recent chats</span>
                  <Skeleton className="h-4 w-4 rounded" />
                </div>
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down data-[state=closed]:duration-200 data-[state=open]:duration-200">
              <SidebarGroupContent className="overflow-hidden relative min-h-0">
                <div className="space-y-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-md">
                      <Skeleton className="h-4 w-4 rounded shrink-0" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <Skeleton className="h-8 w-full rounded-md border border-border/50" />
                </div>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Notebook History skeleton */}
        <SidebarGroup className="overflow-hidden min-w-0">
          <Collapsible open={true}>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent rounded-md px-2 py-1.5 my-1 -mx-2">
                <div className="flex items-center justify-between w-full">
                  <span>Recent notebooks</span>
                  <Skeleton className="h-4 w-4 rounded" />
                </div>
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down data-[state=closed]:duration-200 data-[state=open]:duration-200">
              <SidebarGroupContent className="overflow-hidden relative min-h-0">
                <div className="space-y-1">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-md">
                      <Skeleton className="h-4 w-4 rounded shrink-0" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <Skeleton className="h-8 w-full rounded-md border border-border/50" />
                </div>
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
    <div className="flex-1 h-full overflow-y-auto bg-background min-w-0 flex justify-center">
      <main className="w-full max-w-4xl px-4 sm:px-6 py-12 sm:py-20">
        {/* HERO SECTION */}
        <section className="text-center space-y-5 mb-16">
          {/* Qwery Logo & Brand */}
          <div className="flex flex-col items-center gap-4 mb-8">
            <LogoImage size="2xl" width={256} />
            <Skeleton className="h-10 w-32" />
          </div>
          
          <Skeleton className="h-12 w-96 mx-auto mb-4" />
          <Skeleton className="h-6 w-80 mx-auto" />
        </section>

        {/* PRIMARY CHAT INPUT */}
        <section className="mb-12">
          <div className="bg-card border border-border/60 rounded-lg shadow-sm p-4">
            <Skeleton className="h-32 w-full mb-3" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>

          {/* Example prompts skeleton */}
          <div className="mt-4 flex flex-wrap gap-2.5 justify-center">
            <Skeleton className="h-8 w-32 rounded-md" />
            <Skeleton className="h-8 w-40 rounded-md" />
            <Skeleton className="h-8 w-36 rounded-md" />
          </div>
        </section>

        {/* DIVIDER */}
        <div className="relative my-12">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/40"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-3 text-muted-foreground/70">Quick Actions</span>
          </div>
        </div>

        {/* ACTION CARDS */}
        <section className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="rounded-2xl border bg-card p-8">
            <div className="mb-3 flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-6 w-40" />
            </div>
            <Skeleton className="h-16 w-full mb-6" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="rounded-2xl border bg-card p-8">
            <div className="mb-3 flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-6 w-40" />
            </div>
            <Skeleton className="h-16 w-full mb-6" />
            <Skeleton className="h-4 w-32" />
          </div>
        </section>

        {/* DIVIDER */}
        <div className="relative my-12">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/40"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-3 text-muted-foreground/70">Sample Data</span>
          </div>
        </div>

        {/* PLAYGROUND SECTION */}
        <section className="space-y-4 pb-12">
          <div className="overflow-hidden bg-card rounded-lg border p-8">
            <Skeleton className="h-24 w-full" />
          </div>
        </section>
      </main>
    </div>
  );
}


export default function IndexPage() {
  const navigate = useNavigate();
  const { workspace, repositories } = useWorkspace();

  const project = useGetProjectById(
    repositories.project,
    workspace.projectId || '',
  );

  useEffect(() => {
    if (project.data?.slug) {
      navigate(`/prj/${project.data.slug}`, { replace: true });
    } else if (!workspace.projectId) {
      // If no project yet, redirect to organizations page
      navigate('/organizations', { replace: true });
    }
  }, [project.data?.slug, workspace.projectId, navigate]);

  // Show skeleton while loading or if we have a project but haven't navigated yet
  if (project.isLoading || (workspace.projectId && project.data?.slug)) {
    return (
      <div className="flex h-full min-h-0 flex-1 overflow-hidden overflow-x-hidden">
        <SidebarSkeleton />
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="p-8">
      {workspace.isAnonymous === true && (
        <h1
          className="mb-4 text-2xl font-bold"
          data-test="anon-workspace-message"
        >
          Unlock all the potential of Qwery Platform with a connected workspace.
        </h1>
      )}
      {workspace.isAnonymous === false && workspace.username && (
        <h1 className="mb-4 text-2xl font-bold" data-test="welcome-message">
          Welcome back, {workspace.username}!
        </h1>
      )}
    </div>
  );
}
