import { useEffect } from 'react';

import { useNavigate } from 'react-router';

import { useWorkspace } from '~/lib/context/workspace-context';
import { useGetProjectById } from '~/lib/queries/use-get-projects';

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
