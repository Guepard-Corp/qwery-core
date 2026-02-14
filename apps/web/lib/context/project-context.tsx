'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router';

import type { Project } from '@qwery/domain/entities';
import { useWorkspace } from './workspace-context';
import {
  useGetProjectBySlug,
  useGetProjectById,
} from '~/lib/queries/use-get-projects';
import { useGetDatasourceBySlug } from '~/lib/queries/use-get-datasources';
import { updateWorkspaceProjectInLocalStorage } from '~/lib/workspace/workspace-helper';

const STORAGE_KEY = 'qwery:last-project-slug';

type ProjectContextValue = {
  project: Project | null;
  projectId: string | undefined;
  projectSlug: string | undefined;
  organizationId: string | undefined;
  isLoading: boolean;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

function getStoredSlug(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

function setStoredSlug(slug: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, slug);
}

const noopSubscribe = () => () => {};

function useStoredSlug(active: boolean): string | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => (active ? getStoredSlug() : null),
    () => null,
  );
}

function slugFromPath(pathname: string): string | null {
  const m = pathname.match(/\/prj\/([^/]+)/);
  return m?.[1] ?? null;
}

function slugFromDsPath(pathname: string): string | null {
  const m = pathname.match(/\/ds\/([^/]+)/);
  return m?.[1] ?? null;
}

function resolveSlug(
  pathSlug: string | null,
  dsProjectSlug: string | null,
  storedSlug: string | null,
  routesUsingStoredSlug: boolean,
): string | null {
  if (pathSlug) return pathSlug;
  if (dsProjectSlug) return dsProjectSlug;
  if (routesUsingStoredSlug && storedSlug) return storedSlug;
  return null;
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { repositories } = useWorkspace();
  const { pathname } = useLocation();

  const pathSlug = useMemo(() => slugFromPath(pathname), [pathname]);
  const dsSlug = useMemo(() => slugFromDsPath(pathname), [pathname]);
  const isDsRoute = pathname.startsWith('/ds/');
  const routesUsingStoredSlug =
    pathname.startsWith('/c/') ||
    pathname.startsWith('/notebook/') ||
    pathname.startsWith('/ds/');

  const datasource = useGetDatasourceBySlug(
    repositories.datasource,
    dsSlug ?? '',
    { enabled: isDsRoute && !!dsSlug },
  );
  const projectFromDs = useGetProjectById(
    repositories.project,
    datasource.data?.projectId ?? '',
  );

  const storedSlug = useStoredSlug(routesUsingStoredSlug);
  const slug = useMemo(
    () =>
      resolveSlug(
        pathSlug,
        projectFromDs.data?.slug ?? null,
        storedSlug,
        routesUsingStoredSlug,
      ),
    [pathSlug, projectFromDs.data?.slug, storedSlug, routesUsingStoredSlug],
  );

  const projectBySlug = useGetProjectBySlug(repositories.project, slug ?? '', {
    enabled: !!slug,
  });

  const project: Project | null =
    isDsRoute && projectFromDs.data
      ? projectFromDs.data
      : (projectBySlug.data ?? null);

  const isLoading = isDsRoute
    ? datasource.isLoading || projectFromDs.isLoading
    : projectBySlug.isLoading;

  useEffect(() => {
    if (pathSlug) setStoredSlug(pathSlug);
    else if (isDsRoute && projectFromDs.data?.slug)
      setStoredSlug(projectFromDs.data.slug);
  }, [pathSlug, isDsRoute, projectFromDs.data?.slug]);

  useEffect(() => {
    if (project?.id && project?.organizationId) {
      updateWorkspaceProjectInLocalStorage(project.organizationId, project.id);
    }
  }, [project?.id, project?.organizationId]);

  const value: ProjectContextValue = useMemo(
    () => ({
      project,
      projectId: project?.id,
      projectSlug: slug ?? undefined,
      organizationId: project?.organizationId,
      isLoading,
    }),
    [project, slug, isLoading],
  );

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
}

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within a ProjectProvider');
  return ctx;
}

export function useProjectOptional(): ProjectContextValue | null {
  return useContext(ProjectContext);
}
