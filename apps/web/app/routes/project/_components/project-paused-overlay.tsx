import { PauseCircle } from 'lucide-react';
import { useProjectOptional } from '~/lib/context/project-context';

export function ProjectPausedOverlay() {
  const context = useProjectOptional();
  if (!context) return null;
  const { project, isLoading } = context;

  if (isLoading || !project || project.status !== 'paused') {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card mx-4 max-w-md rounded-2xl border p-8 text-center shadow-2xl">
        <div className="bg-muted mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full">
          <PauseCircle className="text-muted-foreground h-8 w-8" />
        </div>
        <h2 className="text-foreground mb-4 text-2xl font-bold">
          Project Paused
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          The project{' '}
          <span className="text-foreground font-semibold">
            "{project.name}"
          </span>{' '}
          has been paused and is currently not accessible. Please contact your
          administrator to resume access.
        </p>
      </div>
    </div>
  );
}
