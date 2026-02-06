'use client';

import { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { toast } from 'sonner';

import { GetProjectsByOrganizationIdService } from '@qwery/domain/services';
import { getAllExtensionMetadata } from '@qwery/extensions-loader';
import {
  QweryBreadcrumb,
  type BreadcrumbNodeItem,
} from '@qwery/ui/qwery-breadcrumb';
import { useGetDatasourceExtensions } from '~/lib/queries/use-get-extension';

import { useWorkspace } from '~/lib/context/workspace-context';
import { useProject } from '~/lib/context/project-context';
import { useGetOrganizations } from '~/lib/queries/use-get-organizations';
import {
  getProjectsByOrganizationIdKey,
  useGetProjects,
} from '~/lib/queries/use-get-projects';
import { useGetDatasourcesByProjectId } from '~/lib/queries/use-get-datasources';
import { useGetNotebooksByProjectId } from '~/lib/queries/use-get-notebook';
import { useGetDatasourceBySlug } from '~/lib/queries/use-get-datasources';
import { useGetNotebook } from '~/lib/queries/use-get-notebook';
import { useCreateNotebook } from '~/lib/mutations/use-notebook';
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
  const queryClient = useQueryClient();
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
  const [_unsavedNotebookIds, setUnsavedNotebookIds] = useState<string[]>(
    [],
  );
  const [showCreateOrgDialog, setShowCreateOrgDialog] = useState(false);
  const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false);

  useEffect(() => {
    const updateUnsavedIds = () => {
      try {
        const unsaved = JSON.parse(
          localStorage.getItem('notebook:unsaved') || '[]',
        ) as string[];
        setUnsavedNotebookIds(unsaved);
      } catch {
        setUnsavedNotebookIds([]);
      }
    };

    updateUnsavedIds();
    window.addEventListener('storage', updateUnsavedIds);
    const interval = setInterval(updateUnsavedIds, 500);
    return () => {
      window.removeEventListener('storage', updateUnsavedIds);
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
  const { data: extensions = [] } = useGetDatasourceExtensions();

  const pluginLogoMap = useMemo(() => {
    const map = new Map<string, string>();
    extensions.forEach((plugin) => {
      if (plugin.icon) {
        map.set(plugin.id, plugin.icon);
      }
    });
    return map;
  }, [extensions]);

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

  const organizationItemsWithCurrentFirst = useMemo(() => {
    const items = (organizations.data || []).map((org) =>
      toBreadcrumbNodeItem(org),
    );
    if (!currentOrg) return items;
    const idx = items.findIndex((o) => o.id === currentOrg.id);
    if (idx <= 0) return items;
    const rest = items.filter((o) => o.id !== currentOrg.id);
    return [currentOrg, ...rest];
  }, [organizations.data, currentOrg]);

  const projectItemsWithCurrentFirst = useMemo(() => {
    if (!currentProject) return filteredProjects;
    const idx = filteredProjects.findIndex((p) => p.id === currentProject.id);
    if (idx <= 0) return filteredProjects;
    const rest = filteredProjects.filter((p) => p.id !== currentProject.id);
    return [currentProject, ...rest];
  }, [filteredProjects, currentProject]);

  const getSubPathToPreserve = (): string => {
    const prjMatch = location.pathname.match(/^\/prj\/[^/]+(\/.*)?$/);
    if (prjMatch?.[1]) return prjMatch[1];
    if (location.pathname.startsWith('/ds/')) return '/ds';
    if (location.pathname.startsWith('/notebook/')) return '/notebooks';
    if (location.pathname.startsWith('/c/')) return '/c';
    return '';
  };

  const handleOrgSelect = async (org: BreadcrumbNodeItem) => {
    const subPath = getSubPathToPreserve();
    if (subPath) {
      try {
        const useCase = new GetProjectsByOrganizationIdService(
          repositories.project,
        );
        const projectsInNewOrg = await queryClient.fetchQuery({
          queryKey: getProjectsByOrganizationIdKey(org.id),
          queryFn: () => useCase.execute(org.id),
        });
        const first = projectsInNewOrg?.[0];
        if (first) {
          navigate(`/prj/${first.slug}${subPath}`);
          return;
        }
      } catch {
        // fallback to org view
      }
    }
    navigate(createPath(pathsConfig.app.organizationView, org.slug));
  };

  const handleProjectSelect = (project: BreadcrumbNodeItem) => {
    const subPath = getSubPathToPreserve();
    if (subPath) {
      navigate(`/prj/${project.slug}${subPath}`);
      return;
    }
    if (location.pathname.startsWith('/ds/')) {
      navigate(createPath(pathsConfig.app.projectDatasources, project.slug));
      return;
    }
    if (location.pathname.startsWith('/notebook/')) {
      navigate(createPath(pathsConfig.app.projectNotebooks, project.slug));
      return;
    }
    if (location.pathname.startsWith('/c/')) {
      navigate(createPath(pathsConfig.app.projectConversation, project.slug));
      return;
    }
    navigate(createPath(pathsConfig.app.project, project.slug));
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

  const createNotebookMutation = useCreateNotebook(
    repositories.notebook,
    (notebook) => handleNotebookSelect(toBreadcrumbNodeItem(notebook)),
    (error) =>
      toast.error(
        error instanceof Error ? error.message : 'Failed to create notebook',
      ),
  );

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

  const handleNewNotebook = () => {
    if (!projectId) return;
    createNotebookMutation.mutate({ projectId, title: 'New Notebook' });
  };

  // Don't show breadcrumb if no project from URL yet
  if (!projectSlug || isProjectLoading) {
    return null;
  }

  return (
    <>
      <QweryBreadcrumb
        organization={{
          items: organizationItemsWithCurrentFirst,
          isLoading: organizations.isLoading,
          current: currentOrg,
        }}
        project={{
          items: projectItemsWithCurrentFirst,
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
        unsavedNotebookIds={_unsavedNotebookIds}
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
