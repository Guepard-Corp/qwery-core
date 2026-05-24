import { completeTask, createTask, failTask, type Task, type TaskUsage } from '@qwery/domain';

/**
 * Process-local registry of background subagent Tasks. The parent agent
 * launches a subagent in the background; the Task is registered here and
 * the parent receives only a `task_id`. It can poll via the `taskStatus`
 * tool (which reads this registry) without blocking its own loop.
 *
 * Tasks are not persisted — restart the app and the registry is empty.
 * Lift to a TaskRepository when cross-restart resume becomes a need.
 */

export interface BackgroundJobRegistry {
  create(input: { id?: string; sessionId?: string; subagent: string; prompt: string }): Task;
  get(id: string): Task | undefined;
  complete(id: string, text: string, usage?: TaskUsage): void;
  fail(id: string, error: string): void;
  list(): Task[];
}

export function createBackgroundJobRegistry(): BackgroundJobRegistry {
  const tasks = new Map<string, Task>();
  return {
    create({ id, sessionId, subagent, prompt }) {
      const task = createTask({ id, sessionId, subagent, prompt });
      tasks.set(task.id, task);
      return task;
    },
    get(id) {
      return tasks.get(id);
    },
    complete(id, text, usage) {
      const current = tasks.get(id);
      if (!current) return;
      tasks.set(id, completeTask(current, text, usage));
    },
    fail(id, error) {
      const current = tasks.get(id);
      if (!current) return;
      tasks.set(id, failTask(current, error));
    },
    list() {
      return Array.from(tasks.values()).sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    },
  };
}

// Re-export for backwards compatibility with code that imported BackgroundJob.
export type { Task as BackgroundJob } from '@qwery/domain';
export type JobState = Task['state'];
