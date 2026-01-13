'use client';

import { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import type { Notebook, Organization, Project } from '@qwery/domain/entities';
import { getAllExtensionMetadata } from '@qwery/extensions-loader';
import {
  QweryBreadcrumb,
  type BreadcrumbNodeItem,
} from '@qwery/ui/qwery-breadcrumb';

import { useWorkspace } from '~/lib/context/workspace-context';
import { useGetOrganizations } from '~/lib/queries/use-get-organizations';
import { useGetProjects } from '~/lib/queries/use-get-projects';
import { useGetDatasourcesByProjectId } from '~/lib/queries/use-get-datasources';
import { useGetNotebooksByProjectId } from '~/lib/queries/use-get-notebook';
import { useGetDatasourceBySlug } from '~/lib/queries/use-get-datasources';
import { useGetNotebook } from '~/lib/queries/use-get-notebook';
import pathsConfig, { createPath } from '~/config/paths.config';

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
  const { t } = useTranslation('common');
  const { workspace, repositories } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [unsavedNotebookSlugs, setUnsavedNotebookSlugs] = useState<string[]>(
    [],
  );

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

  // Fetch data
  const organizations = useGetOrganizations(repositories.organization);
  const projects = useGetProjects(
    repositories.project,
    workspace.organizationId || '',
  );
  // Only fetch datasources when on a datasource route
  const datasources = useGetDatasourcesByProjectId(
    repositories.datasource,
    workspace.projectId || '',
    { enabled: isDatasourceRoute },
  );
  const notebooks = useGetNotebooksByProjectId(
    repositories.notebook,
    workspace.projectId,
    { enabled: isNotebookRoute },
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

  // Get current items
  const currentOrg = useMemo(() => {
    if (!workspace.organizationId || !organizations.data) return null;
    const org = organizations.data.find(
      (org) => org.id === workspace.organizationId,
    );
    return org ? toBreadcrumbNodeItem(org) : null;
  }, [workspace.organizationId, organizations.data]);

  const currentProject = useMemo(() => {
    if (!workspace.projectId || !projects.data) return null;
    const proj = projects.data.find((proj) => proj.id === workspace.projectId);
    return proj ? toBreadcrumbNodeItem(proj) : null;
  }, [workspace.projectId, projects.data]);

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

  // Filter projects by current org
  const filteredProjects = useMemo(() => {
    if (!projects.data || !workspace.organizationId) return [];
    return projects.data
      .filter((proj) => proj.organizationId === workspace.organizationId)
      .map((proj) => toBreadcrumbNodeItem(proj));
  }, [projects.data, workspace.organizationId]);

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

  const handleNewOrg = async () => {
    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Organization',
          is_owner: true,
          createdBy: workspace.username || 'system',
        }),
      });
      if (response.ok) {
        const org: Organization = await response.json();
        await organizations.refetch();
        handleOrgSelect(toBreadcrumbNodeItem(org));
      }
    } catch (error) {
      console.error('Failed to create organization:', error);
    }
  };

  const handleNewProject = async () => {
    if (!workspace.organizationId) return;
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: workspace.organizationId,
          name: 'New Project',
          createdBy: workspace.username || 'system',
        }),
      });
      if (response.ok) {
        const project: Project = await response.json();
        await projects.refetch();
        handleProjectSelect(toBreadcrumbNodeItem(project));
      }
    } catch (error) {
      console.error('Failed to create project:', error);
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
    if (!workspace.projectId) return;
    try {
      const response = await fetch('/api/notebooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: workspace.projectId,
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

  // Don't show breadcrumb if no org/project
  if (!workspace.organizationId || !workspace.projectId) {
    return null;
  }

  return (
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
      labels={{
        searchOrgs: t('breadcrumb.searchOrgs'),
        searchProjects: t('breadcrumb.searchProjects'),
        searchDatasources: t('breadcrumb.searchDatasources'),
        searchNotebooks: t('breadcrumb.searchNotebooks'),
        viewAllOrgs: t('breadcrumb.viewAllOrgs'),
        viewAllProjects: t('breadcrumb.viewAllProjects'),
        viewAllDatasources: t('breadcrumb.viewAllDatasources'),
        viewAllNotebooks: t('breadcrumb.viewAllNotebooks'),
        newOrg: t('breadcrumb.newOrg'),
        newProject: t('breadcrumb.newProject'),
        newDatasource: t('breadcrumb.newDatasource'),
        newNotebook: t('breadcrumb.newNotebook'),
        loading: t('breadcrumb.loading'),
      }}
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
            createPath(pathsConfig.app.projectDatasources, currentProject.slug),
          );
        }
      }}
      onViewAllNotebooks={() => {
        if (currentProject) {
          navigate(createPath(pathsConfig.app.projectNotebooks, currentProject.slug));
        }
      }}
      onNewOrg={handleNewOrg}
      onNewProject={handleNewProject}
      onNewDatasource={handleNewDatasource}
      onNewNotebook={handleNewNotebook}
    />
  );
}
