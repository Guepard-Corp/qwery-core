'use client';

import { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';

import type { Notebook } from '@qwery/domain/entities';
import { getAllExtensionMetadata } from '@qwery/extensions-loader';
import {
  QweryBreadcrumb,
  type BreadcrumbNodeItem,
} from '@qwery/ui/qwery-breadcrumb';

import { useWorkspace } from '~/lib/context/workspace-context';
import { useProject } from '~/lib/context/project-context';
import { useGetOrganizations } from '~/lib/queries/use-get-organizations';
import { useGetProjects } from '~/lib/queries/use-get-projects';
import { useGetDatasourcesByProjectId } from '~/lib/queries/use-get-datasources';
import { useGetNotebooksByProjectId } from '~/lib/queries/use-get-notebook';
import { useGetDatasourceBySlug } from '~/lib/queries/use-get-datasources';
import { useGetNotebook } from '~/lib/queries/use-get-notebook';
import pathsConfig, { createPath } from '~/config/paths.config';
import { OrganizationDialog } from '../../organizations/_components/organization-dialog';
import { ProjectDialog } from '../../organization/_components/project-dialog';

function toBreadcrumbNodeItem<
  T extends { id: string; slug: string; name?: string; title?: string },
>(item: T, icon?: string): BreadcrumbNodeItem {
  const name = 'name' in item && item.name ? item.name : item.title || '';
  return {
    id: item.id,
    slug: item.slug,
    name,
    ...(icon && { icon }),
  };
}

export function ProjectBreadcrumb() {
  const { repositories } = useWorkspace();
  const {
    project,
    projectId,
    projectSlug,
    organizationId,
    isLoading: isProjectLoading,
  } = useProject();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [_unsavedNotebookSlugs, setUnsavedNotebookSlugs] = useState<string[]>(
    [],
  );
  const [showCreateOrgDialog, setShowCreateOrgDialog] = useState(false);
  const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false);

  useEffect(() => {
    const updateUnsavedSlugs = () => {
      try {
        const unsaved = JSON.parse(
          localStorage.getItem('notebook:unsaved') || '[]',
        ) as string[];
        setUnsavedNotebookSlugs(unsaved);
      } catch {
        setUnsavedNotebookSlugs([]);
      }
    };

    updateUnsavedSlugs();
    window.addEventListener('storage', updateUnsavedSlugs);
    const interval = setInterval(updateUnsavedSlugs, 500);
    return () => {
      window.removeEventListener('storage', updateUnsavedSlugs);
      clearInterval(interval);
    };
  }, []);

  // Detect current object (datasource or notebook)
  const isDatasourceRoute = location.pathname.startsWith('/ds/');
  const isNotebookRoute = location.pathname.startsWith('/notebook/');
  const objectSlug = isDatasourceRoute
    ? (params.slug as string)
    : isNotebookRoute
      ? (params.slug as string)
      : undefined;

  // Fetch data using URL-derived IDs
  const organizations = useGetOrganizations(repositories.organization);
  const projects = useGetProjects(repositories.project, organizationId || '');
  // Only fetch datasources when on a datasource route
  const datasources = useGetDatasourcesByProjectId(
    repositories.datasource,
    projectId || '',
    { enabled: isDatasourceRoute && !!projectId },
  );
  const notebooks = useGetNotebooksByProjectId(
    repositories.notebook,
    projectId,
    { enabled: isNotebookRoute && !!projectId },
  );
  const currentDatasource = useGetDatasourceBySlug(
    repositories.datasource,
    objectSlug || '',
    { enabled: isDatasourceRoute },
  );
  const currentNotebook = useGetNotebook(
    repositories.notebook,
    objectSlug || '',
    { enabled: isNotebookRoute },
  );

  // Fetch extension metadata for datasource icons
  const { data: pluginMetadata = [] } = useQuery({
    queryKey: ['all-plugin-metadata'],
    queryFn: () => getAllExtensionMetadata(),
    staleTime: 60 * 1000,
  });

  const pluginLogoMap = useMemo(() => {
    const map = new Map<string, string>();
    pluginMetadata.forEach((plugin) => {
      if (plugin?.id && plugin.logo) {
        map.set(plugin.id, plugin.logo);
      }
    });
    return map;
  }, [pluginMetadata]);

  // Get current items from URL-derived data
  const currentOrg = useMemo(() => {
    if (!organizationId || !organizations.data) return null;
    const org = organizations.data.find((org) => org.id === organizationId);
    return org ? toBreadcrumbNodeItem(org) : null;
  }, [organizationId, organizations.data]);

  const currentProject = useMemo(() => {
    if (!project) return null;
    return toBreadcrumbNodeItem(project);
  }, [project]);

  const currentObject = useMemo(() => {
    if (isDatasourceRoute && currentDatasource.data) {
      return {
        current: toBreadcrumbNodeItem(
          currentDatasource.data,
          pluginLogoMap.get(currentDatasource.data.datasource_provider),
        ),
        type: 'datasource' as const,
      };
    }
    if (isNotebookRoute && currentNotebook.data) {
      return {
        current: toBreadcrumbNodeItem(currentNotebook.data),
        type: 'notebook' as const,
      };
    }
    return undefined;
  }, [
    isDatasourceRoute,
    isNotebookRoute,
    currentDatasource.data,
    currentNotebook.data,
    pluginLogoMap,
  ]);

  // Filter projects by current org (from URL-derived organizationId)
  const filteredProjects = useMemo(() => {
    if (!projects.data || !organizationId) return [];
    return projects.data
      .filter((proj) => proj.organizationId === organizationId)
      .map((proj) => toBreadcrumbNodeItem(proj));
  }, [projects.data, organizationId]);

  // Handlers
  const handleOrgSelect = (org: BreadcrumbNodeItem) => {
    const path = createPath(pathsConfig.app.organizationView, org.slug);
    navigate(path);
  };

  const handleProjectSelect = (project: BreadcrumbNodeItem) => {
    const path = createPath(pathsConfig.app.project, project.slug);
    navigate(path);
  };

  const handleDatasourceSelect = (datasource: BreadcrumbNodeItem) => {
    // Preserve the current path segment (e.g., /settings, /tables, /schema)
    const currentPath = location.pathname;
    const datasourceRouteMatch = currentPath.match(/^\/ds\/[^/]+(\/.*)?$/);
    const currentSegment = datasourceRouteMatch?.[1] || '/tables';

    // Navigate to the new datasource with the same path segment
    const newPath = `/ds/${datasource.slug}${currentSegment}`;
    navigate(newPath);
  };

  const handleNotebookSelect = (notebook: BreadcrumbNodeItem) => {
    const path = createPath(pathsConfig.app.projectNotebook, notebook.slug);
    navigate(path);
  };

  const handleNewOrg = () => {
    setShowCreateOrgDialog(true);
  };

  const handleNewProject = () => {
    if (!organizationId) return;
    setShowCreateProjectDialog(true);
  };

  const handleOrgDialogSuccess = async () => {
    await organizations.refetch();
    // Find the newly created org (last one in the list) and navigate to it
    if (organizations.data && organizations.data.length > 0) {
      const latestOrg = organizations.data[organizations.data.length - 1];
      if (latestOrg) {
        handleOrgSelect(toBreadcrumbNodeItem(latestOrg));
      }
    }
  };

  const handleProjectDialogSuccess = async () => {
    await projects.refetch();
    // Find the newly created project (last one in the list) and navigate to it
    if (projects.data && projects.data.length > 0) {
      const latestProject = projects.data[projects.data.length - 1];
      if (latestProject) {
        handleProjectSelect(toBreadcrumbNodeItem(latestProject));
      }
    }
  };

  const handleNewDatasource = () => {
    if (!currentProject?.slug) return;
    const path = createPath(
      pathsConfig.app.availableSources,
      currentProject.slug,
    );
    navigate(path);
  };

  const handleNewNotebook = async () => {
    if (!projectId) return;
    try {
      const response = await fetch('/api/notebooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectId,
          title: 'New Notebook',
        }),
      });
      if (response.ok) {
        const notebook: Notebook = await response.json();
        await notebooks.refetch();
        handleNotebookSelect(toBreadcrumbNodeItem(notebook));
      }
    } catch (error) {
      console.error('Failed to create notebook:', error);
    }
  };

  // Don't show breadcrumb if no project from URL yet
  if (!projectSlug || isProjectLoading) {
    return null;
  }

  return (
    <>
      <QweryBreadcrumb
        organization={{
          items: (organizations.data || []).map((org) =>
            toBreadcrumbNodeItem(org),
          ),
          isLoading: organizations.isLoading,
          current: currentOrg,
        }}
        project={{
          items: filteredProjects,
          isLoading: projects.isLoading,
          current: currentProject,
        }}
        object={
          currentObject
            ? {
                items:
                  currentObject.type === 'datasource'
                    ? (datasources.data || []).map((ds) =>
                        toBreadcrumbNodeItem(
                          ds,
                          pluginLogoMap.get(ds.datasource_provider),
                        ),
                      )
                    : (notebooks.data || []).map((nb) => ({
                        id: nb.id,
                        slug: nb.slug,
                        name: nb.title,
                      })),
                isLoading:
                  currentObject.type === 'datasource'
                    ? datasources.isLoading
                    : notebooks.isLoading,
                current: currentObject.current,
                type: currentObject.type,
              }
            : undefined
        }
        paths={{
          viewAllOrgs: pathsConfig.app.organizations,
          viewAllProjects: createPath(
            pathsConfig.app.organizationView,
            currentOrg?.slug || '',
          ),
          viewAllDatasources: createPath(
            pathsConfig.app.projectDatasources,
            currentProject?.slug || '',
          ),
          viewAllNotebooks: createPath(
            pathsConfig.app.projectNotebooks,
            currentProject?.slug || '',
          ),
        }}
        onOrganizationSelect={handleOrgSelect}
        onProjectSelect={handleProjectSelect}
        onDatasourceSelect={handleDatasourceSelect}
        onNotebookSelect={handleNotebookSelect}
        onViewAllOrgs={() => navigate(pathsConfig.app.organizations)}
        onViewAllProjects={() => {
          if (currentOrg) {
            navigate(
              createPath(pathsConfig.app.organizationView, currentOrg.slug),
            );
          }
        }}
        onViewAllDatasources={() => {
          if (currentProject) {
            navigate(
              createPath(
                pathsConfig.app.projectDatasources,
                currentProject.slug,
              ),
            );
          }
        }}
        onViewAllNotebooks={() => {
          if (currentProject) {
            navigate(
              createPath(pathsConfig.app.projectNotebooks, currentProject.slug),
            );
          }
        }}
        onNewOrg={handleNewOrg}
        onNewProject={handleNewProject}
        onNewDatasource={handleNewDatasource}
        onNewNotebook={handleNewNotebook}
        unsavedNotebookSlugs={_unsavedNotebookSlugs}
      />
      <OrganizationDialog
        open={showCreateOrgDialog}
        onOpenChange={setShowCreateOrgDialog}
        organization={null}
        onSuccess={handleOrgDialogSuccess}
      />
      {organizationId && (
        <ProjectDialog
          open={showCreateProjectDialog}
          onOpenChange={setShowCreateProjectDialog}
          project={null}
          organizationId={organizationId}
          onSuccess={handleProjectDialogSuccess}
        />
      )}
    </>
  );
}
