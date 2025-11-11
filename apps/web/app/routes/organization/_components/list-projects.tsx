import { ReactNode, useMemo, useState } from 'react';

import { useNavigate } from 'react-router';

import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { useTranslation } from 'react-i18next';

import type { Project } from '@qwery/domain/entities';
import { Card, CardContent } from '@qwery/ui/card';
import { Input } from '@qwery/ui/input';
import { Trans } from '@qwery/ui/trans';

import pathsConfig, { createPath } from '~/config/paths.config';

export function ListProjects({
  projects,
  newProjectButton,
}: {
  projects: Project[];
  newProjectButton?: ReactNode;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation('organizations');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) {
      return projects;
    }

    const query = searchQuery.toLowerCase();
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(query) ||
        project.slug.toLowerCase().includes(query),
    );
  }, [projects, searchQuery]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">
          <Trans i18nKey="organizations:projects_title" />
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative max-w-md flex-1">
          <MagnifyingGlassIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            type="search"
            placeholder={t('search_project_placeholder')}
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {newProjectButton}
      </div>

      {filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-foreground mb-2 text-base font-medium">
            <Trans i18nKey="organizations:no_projects" />
          </p>
          <p className="text-muted-foreground text-sm">
            <Trans i18nKey="organizations:no_projects_description" />
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              className="hover:bg-accent/50 cursor-pointer transition-colors"
              onClick={() => {
                const path = createPath(pathsConfig.app.project, project.slug);
                navigate(path);
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-lg">
                    <svg
                      className="text-foreground h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-1 truncate text-base font-semibold">
                      {project.name}
                    </h3>
                    <div className="text-muted-foreground flex items-center gap-1 text-sm">
                      <span>{project.region}</span>
                      <span>•</span>
                      <span
                        className={`${
                          project.status === 'active'
                            ? 'text-green-600'
                            : project.status === 'inactive'
                              ? 'text-gray-500'
                              : 'text-orange-600'
                        }`}
                      >
                        {project.status}
                      </span>
                    </div>
                    {project.description && (
                      <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">
                        {project.description}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
