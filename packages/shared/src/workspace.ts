'use client';

import type { Workspace } from '@qwery/domain/entities';

const WORKSPACE_STORAGE_KEY = 'qwery-workspace';

export function getWorkspaceFromLocalStorage(): Workspace {
  const defaultWorkspace = {} as Workspace;

  if (typeof window === 'undefined') {
    return defaultWorkspace;
  }

  try {
    const stored = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Workspace;
      return { ...defaultWorkspace, ...parsed };
    }
  } catch (error) {
    console.warn('Failed to read workspace from localStorage:', error);
  }

  return defaultWorkspace;
}

export function setWorkspaceInLocalStorage(workspace: Workspace) {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
}

export function updateWorkspaceProjectInLocalStorage(
  organizationId: string,
  projectId: string,
): void {
  const current = getWorkspaceFromLocalStorage();
  setWorkspaceInLocalStorage({
    ...current,
    organizationId,
    projectId,
  } as Workspace);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('workspace-updated'));
  }
}
