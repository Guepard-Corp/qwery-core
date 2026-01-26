'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router';

import type { Project } from '@qwery/domain/entities';
import { useWorkspace } from './workspace-context';
import { useGetProjectBySlug } from '~/lib/queries/use-get-projects';

const LAST_PROJECT_SLUG_KEY = 'qwery:last-project-slug';

interface ProjectContextValue {
  project: Project | null;
  projectId: string | undefined;
  projectSlug: string | undefined;
  organizationId: string | undefined;
  isLoading: boolean;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

function getStoredProjectSlug(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LAST_PROJECT_SLUG_KEY);
}

function storeProjectSlug(slug: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_PROJECT_SLUG_KEY, slug);
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { repositories } = useWorkspace();
  const location = useLocation();

  // Try to extract project slug from URL (for /prj/[slug] routes)
  const projectSlugMatch = location.pathname.match(/^\/prj\/([^/]+)/);
  const slugFromUrl = projectSlugMatch?.[1];

  // For /c/ and /notebook/ routes, use stored project slug
  const isConversationOrNotebookRoute =
    location.pathname.startsWith('/c/') ||
    location.pathname.startsWith('/notebook/');

  const projectSlug =
    slugFromUrl ||
    (isConversationOrNotebookRoute ? getStoredProjectSlug() : null);

  // Store project slug when on /prj/ route
  useEffect(() => {
    if (slugFromUrl) {
      storeProjectSlug(slugFromUrl);
    }
  }, [slugFromUrl]);

  const projectQuery = useGetProjectBySlug(
    repositories.project,
    projectSlug || '',
  );

  const value: ProjectContextValue = {
    project: projectQuery.data ?? null,
    projectId: projectQuery.data?.id,
    projectSlug: projectSlug ?? undefined,
    organizationId: projectQuery.data?.organizationId,
    isLoading: projectQuery.isLoading,
  };

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
