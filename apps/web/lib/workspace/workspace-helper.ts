'use client';

import { Workspace } from '@qwery/domain/entities';

const WORKSPACE_STORAGE_KEY = 'qwery-workspace';

/**
 * Get the workspace from the local storage or initialize it if it doesn't exist.
 * Each navigation to an organization of project will be kept on the local storage so
 * the user can navigate back to the same organization or project.
 * @returns WorkspaceOnLocalStorage
 */
export function getWorkspaceFromLocalStorage(): Workspace {
  const defaultWorkspace = {} as Workspace;

  // Guard against SSR - localStorage is only available in the browser
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
  // Guard against SSR - localStorage is only available in the browser
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
}
