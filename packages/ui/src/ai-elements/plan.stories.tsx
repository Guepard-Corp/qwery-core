import type { Meta, StoryObj } from '@storybook/react';
import {
  Plan,
  PlanHeader,
  PlanTitle,
  PlanDescription,
  PlanContent,
  PlanTrigger,
  PlanAction,
  PlanFooter,
} from './plan';
import { Task, TaskTrigger, TaskContent, TaskItem } from './task';

const meta: Meta<typeof Plan> = {
  title: 'AI Elements/Plan',
  component: Plan,
};

export default meta;
type Story = StoryObj<typeof Plan>;

export const Simple: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Plan defaultOpen={true}>
        <PlanHeader>
          <div>
            <PlanTitle>Build a React Application</PlanTitle>
            <PlanDescription>
              Step-by-step plan to create a new React application
            </PlanDescription>
          </div>
          <PlanTrigger />
        </PlanHeader>
        <PlanContent>
          <div className="space-y-2">
            <Task defaultOpen={true}>
              <TaskTrigger title="Set up project structure" />
              <TaskContent>
                <TaskItem>Create project directory</TaskItem>
                <TaskItem>Initialize package.json</TaskItem>
                <TaskItem>Install dependencies</TaskItem>
              </TaskContent>
            </Task>
            <Task defaultOpen={true}>
              <TaskTrigger title="Configure build tools" />
              <TaskContent>
                <TaskItem>Set up Vite or Webpack</TaskItem>
                <TaskItem>Configure TypeScript</TaskItem>
              </TaskContent>
            </Task>
          </div>
        </PlanContent>
      </Plan>
    </div>
  ),
};

export const Streaming: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Plan defaultOpen={true} isStreaming={true}>
        <PlanHeader>
          <div>
            <PlanTitle>Generating plan...</PlanTitle>
            <PlanDescription>Creating a detailed plan for you</PlanDescription>
          </div>
          <PlanTrigger />
        </PlanHeader>
        <PlanContent>
          <p className="text-sm text-muted-foreground">
            Plan content will appear here...
          </p>
        </PlanContent>
      </Plan>
    </div>
  ),
};

export const Collapsed: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Plan defaultOpen={false}>
        <PlanHeader>
          <div>
            <PlanTitle>Complete Plan</PlanTitle>
            <PlanDescription>
              A comprehensive plan with multiple steps
            </PlanDescription>
          </div>
          <PlanTrigger />
        </PlanHeader>
        <PlanContent>
          <div className="space-y-2">
            <Task defaultOpen={false}>
              <TaskTrigger title="Step 1: Preparation" />
              <TaskContent>
                <TaskItem>Gather requirements</TaskItem>
                <TaskItem>Set up development environment</TaskItem>
              </TaskContent>
            </Task>
            <Task defaultOpen={false}>
              <TaskTrigger title="Step 2: Implementation" />
              <TaskContent>
                <TaskItem>Write code</TaskItem>
                <TaskItem>Test functionality</TaskItem>
              </TaskContent>
            </Task>
            <Task defaultOpen={false}>
              <TaskTrigger title="Step 3: Deployment" />
              <TaskContent>
                <TaskItem>Build for production</TaskItem>
                <TaskItem>Deploy to server</TaskItem>
              </TaskContent>
            </Task>
          </div>
        </PlanContent>
      </Plan>
    </div>
  ),
};

export const WithActions: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Plan defaultOpen={true}>
        <PlanHeader>
          <div>
            <PlanTitle>Action Plan</PlanTitle>
            <PlanDescription>Plan with action buttons</PlanDescription>
          </div>
          <div className="flex items-center gap-2">
            <PlanAction>
              <button className="text-sm">Execute</button>
            </PlanAction>
            <PlanTrigger />
          </div>
        </PlanHeader>
        <PlanContent>
          <div className="space-y-2">
            <Task defaultOpen={true}>
              <TaskTrigger title="First task" />
              <TaskContent>
                <TaskItem>Complete this task</TaskItem>
              </TaskContent>
            </Task>
          </div>
        </PlanContent>
        <PlanFooter>
          <p className="text-xs text-muted-foreground">
            Plan created on {new Date().toLocaleDateString()}
          </p>
        </PlanFooter>
      </Plan>
    </div>
  ),
};

