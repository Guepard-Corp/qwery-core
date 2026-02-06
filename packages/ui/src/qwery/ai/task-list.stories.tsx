import type { Meta, StoryObj } from '@storybook/react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../shadcn/collapsible';
import { TaskItemFile } from '../../ai-elements/task';
import { TaskPart, StartedStepIndicator } from './message-parts';
import type { TaskUIPart, TaskStatus } from './message-parts';
import { ChevronDownIcon, SearchIcon } from 'lucide-react';

const OLD_BADGE_META: Record<
  TaskStatus,
  { label: string; badgeClass: string }
> = {
  pending: { label: 'Queued', badgeClass: 'bg-secondary text-foreground' },
  'in-progress': { label: 'Running', badgeClass: 'bg-primary/10 text-primary' },
  completed: {
    label: 'Done',
    badgeClass: 'bg-emerald-500/15 text-emerald-600',
  },
  error: { label: 'Error', badgeClass: 'bg-destructive/10 text-destructive' },
};

function OldTaskPart({ part }: { part: TaskUIPart }) {
  return (
    <Collapsible
      defaultOpen
      className="border-border bg-background/60 w-full border"
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="group text-muted-foreground hover:text-foreground flex w-full cursor-pointer items-center gap-2 py-2 text-sm transition-colors"
        >
          <SearchIcon className="size-4" />
          <span className="flex-1 text-left">{part.data.title}</span>
          <ChevronDownIcon className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-muted mt-4 space-y-2 border-l-2 pl-4">
          {part.data.subtitle ? (
            <p className="text-muted-foreground text-xs">
              {part.data.subtitle}
            </p>
          ) : null}
          {part.data.tasks.map((task) => {
            const meta = OLD_BADGE_META[task.status];
            return (
              <div
                key={task.id}
                className="text-foreground flex flex-col gap-1 text-sm"
              >
                <div className="flex items-center gap-2">
                  <TaskItemFile className={meta.badgeClass}>
                    {meta.label}
                  </TaskItemFile>
                  <span>{task.label}</span>
                </div>
                {task.description ? (
                  <p className="text-muted-foreground text-xs">
                    {task.description}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

const meta: Meta = {
  title: 'Qwery/AI/Task List',
  component: TaskPart,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof TaskPart>;

const defaultPart: TaskUIPart = {
  type: 'data-tasks',
  id: 'task-1',
  data: {
    title: 'Processing Request',
    subtitle: 'Breaking down your request into tasks',
    tasks: [
      {
        id: 't1',
        label: 'Analyze input data',
        description: 'Processing the provided information',
        status: 'completed',
      },
      {
        id: 't2',
        label: 'Generate response',
        description: 'Creating the final output',
        status: 'in-progress',
      },
      {
        id: 't3',
        label: 'Validate results',
        status: 'pending',
      },
      {
        id: 't4',
        label: 'Failed task',
        description: 'This task encountered an error',
        status: 'error',
      },
    ],
  },
};

export const Default: Story = {
  args: {
    part: defaultPart,
    messageId: 'msg-1',
    index: 0,
  },
  render: (args) => (
    <div className="bg-background w-full max-w-md p-6">
      <TaskPart {...args} />
    </div>
  ),
};

export const Minimal: Story = {
  args: {
    part: {
      ...defaultPart,
      data: {
        title: 'Steps',
        tasks: [
          { id: 'a', label: 'Connect to datasource', status: 'completed' },
          { id: 'b', label: 'Run query', status: 'in-progress' },
          { id: 'c', label: 'Return results', status: 'pending' },
        ],
      },
    },
    messageId: 'msg-1',
    index: 0,
  },
  render: (args) => (
    <div className="bg-background w-full max-w-md p-6">
      <TaskPart {...args} />
    </div>
  ),
};

export const AllPending: Story = {
  args: {
    part: {
      ...defaultPart,
      data: {
        title: 'Queued',
        subtitle: 'Waiting to start',
        tasks: [
          { id: '1', label: 'Step one', status: 'pending' },
          { id: '2', label: 'Step two', status: 'pending' },
          { id: '3', label: 'Step three', status: 'pending' },
        ],
      },
    },
    messageId: 'msg-1',
    index: 0,
  },
  render: (args) => (
    <div className="bg-background w-full max-w-md p-6">
      <TaskPart {...args} />
    </div>
  ),
};

export const SideBySide: Story = {
  args: {
    part: defaultPart,
    messageId: 'msg-1',
    index: 0,
  },
  render: (args) => (
    <div className="bg-background flex gap-8 p-6">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          Old
        </p>
        <OldTaskPart part={args.part} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          New
        </p>
        <TaskPart {...args} />
      </div>
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};

const partWithSubsteps: TaskUIPart = {
  type: 'data-tasks',
  id: 'with-substeps',
  data: {
    title: 'Query pipeline',
    subtitle: 'Steps can have dynamic descriptions and nested substeps',
    tasks: [
      {
        id: 's1',
        label: 'Parse & validate',
        description: 'Parsing SQL… validated 3 tables',
        status: 'completed',
        substeps: [
          { id: 's1a', label: 'Lexer', status: 'completed' },
          { id: 's1b', label: 'AST build', status: 'completed' },
          { id: 's1c', label: 'Schema check', status: 'completed' },
        ],
      },
      {
        id: 's2',
        label: 'Connect & execute',
        description: 'Streaming rows from primary',
        status: 'in-progress',
        substeps: [
          { id: 's2a', label: 'Open connection', status: 'completed' },
          {
            id: 's2b',
            label: 'Execute query',
            status: 'in-progress',
            description: '~2.1k rows',
          },
          { id: 's2c', label: 'Fetch batch', status: 'pending' },
        ],
      },
      {
        id: 's3',
        label: 'Return results',
        status: 'pending',
      },
    ],
  },
};

export const WithSubsteps: Story = {
  args: {
    part: partWithSubsteps,
    messageId: 'msg-1',
    index: 0,
  },
  render: (args) => (
    <div className="bg-background w-full max-w-md p-6">
      <TaskPart {...args} />
    </div>
  ),
};

export const StartedStepStandalone: Story = {
  render: () => (
    <div className="bg-background flex flex-col gap-4 p-6">
      <StartedStepIndicator stepIndex={1} />
      <StartedStepIndicator stepIndex={2} stepLabel="Connect to datasource" />
      <StartedStepIndicator stepIndex={3} stepLabel="Execute & validate" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Standalone "Started step X" chips for use in chat or logs.',
      },
    },
  },
};

export const StartedStepInChat: Story = {
  render: () => (
    <div className="bg-background border-border mx-auto w-full max-w-lg rounded-lg border p-4 shadow-sm">
      <div className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase">
        Chat message (assistant)
      </div>
      <p className="text-foreground mb-2 text-sm">
        Running your query. This may take a few seconds.
      </p>
      <StartedStepIndicator stepIndex={2} stepLabel="Connect to datasource" />
    </div>
  ),
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        story:
          'StartedStepIndicator injected inside a chat message. Use when the backend emits "started step N" events.',
      },
    },
  },
};

export const StepByStepAnimation: Story = {
  args: {
    part: partWithSubsteps,
    messageId: 'msg-1',
    index: 0,
  },
  render: (args) => (
    <div className="bg-background w-full max-w-md p-6">
      <TaskPart {...args} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Task list with dynamic descriptions and substeps. The step-by-step auto-animation was removed; use WithSubsteps for the same data.',
      },
    },
  },
};
