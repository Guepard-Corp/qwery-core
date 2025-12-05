import type { Meta, StoryObj } from '@storybook/react';
import { Task, TaskTrigger, TaskContent, TaskItem, TaskItemFile } from './task';

const meta: Meta<typeof Task> = {
  title: 'AI Elements/Task',
  component: Task,
};

export default meta;
type Story = StoryObj<typeof Task>;

export const Simple: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Task defaultOpen={true}>
        <TaskTrigger title="Complete setup" />
        <TaskContent>
          <TaskItem>Install dependencies</TaskItem>
          <TaskItem>Configure environment</TaskItem>
          <TaskItem>Run initial tests</TaskItem>
        </TaskContent>
      </Task>
    </div>
  ),
};

export const Collapsed: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Task defaultOpen={false}>
        <TaskTrigger title="Review code" />
        <TaskContent>
          <TaskItem>Check syntax</TaskItem>
          <TaskItem>Verify logic</TaskItem>
          <TaskItem>Test functionality</TaskItem>
        </TaskContent>
      </Task>
    </div>
  ),
};

export const WithFiles: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Task defaultOpen={true}>
        <TaskTrigger title="Process files" />
        <TaskContent>
          <TaskItem>
            <TaskItemFile>document.pdf</TaskItemFile>
          </TaskItem>
          <TaskItem>
            <TaskItemFile>image.jpg</TaskItemFile>
          </TaskItem>
          <TaskItem>
            <TaskItemFile>data.csv</TaskItemFile>
          </TaskItem>
        </TaskContent>
      </Task>
    </div>
  ),
};

export const MultipleTasks: Story = {
  render: () => (
    <div className="max-w-2xl space-y-2">
      <Task defaultOpen={true}>
        <TaskTrigger title="Task 1: Setup" />
        <TaskContent>
          <TaskItem>Initialize project</TaskItem>
          <TaskItem>Install dependencies</TaskItem>
        </TaskContent>
      </Task>
      <Task defaultOpen={false}>
        <TaskTrigger title="Task 2: Development" />
        <TaskContent>
          <TaskItem>Write code</TaskItem>
          <TaskItem>Add tests</TaskItem>
        </TaskContent>
      </Task>
      <Task defaultOpen={false}>
        <TaskTrigger title="Task 3: Deployment" />
        <TaskContent>
          <TaskItem>Build for production</TaskItem>
          <TaskItem>Deploy to server</TaskItem>
        </TaskContent>
      </Task>
    </div>
  ),
};

export const LongContent: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Task defaultOpen={true}>
        <TaskTrigger title="Complex task with many steps" />
        <TaskContent>
          <TaskItem>Step 1: Prepare the environment</TaskItem>
          <TaskItem>Step 2: Configure the settings</TaskItem>
          <TaskItem>Step 3: Initialize the database</TaskItem>
          <TaskItem>Step 4: Set up authentication</TaskItem>
          <TaskItem>Step 5: Create API endpoints</TaskItem>
          <TaskItem>Step 6: Implement business logic</TaskItem>
          <TaskItem>Step 7: Add error handling</TaskItem>
          <TaskItem>Step 8: Write unit tests</TaskItem>
          <TaskItem>Step 9: Run integration tests</TaskItem>
          <TaskItem>Step 10: Deploy to staging</TaskItem>
        </TaskContent>
      </Task>
    </div>
  ),
};
