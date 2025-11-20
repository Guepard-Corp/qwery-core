import type { Meta, StoryObj } from '@storybook/react';
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
} from './chain-of-thought';

const meta: Meta<typeof ChainOfThought> = {
  title: 'AI Elements/ChainOfThought',
  component: ChainOfThought,
};

export default meta;
type Story = StoryObj<typeof ChainOfThought>;

export const Simple: Story = {
  render: () => (
    <div className="max-w-2xl">
      <ChainOfThought defaultOpen={true}>
        <ChainOfThoughtHeader>Reasoning Process</ChainOfThoughtHeader>
        <ChainOfThoughtContent>
          <ChainOfThoughtStep>
            First, I need to understand the problem statement.
          </ChainOfThoughtStep>
          <ChainOfThoughtStep>
            Then, I'll break it down into smaller components.
          </ChainOfThoughtStep>
          <ChainOfThoughtStep>
            Finally, I'll synthesize the solution.
          </ChainOfThoughtStep>
        </ChainOfThoughtContent>
      </ChainOfThought>
    </div>
  ),
};

export const Collapsed: Story = {
  render: () => (
    <div className="max-w-2xl">
      <ChainOfThought defaultOpen={false}>
        <ChainOfThoughtHeader>Complex Reasoning</ChainOfThoughtHeader>
        <ChainOfThoughtContent>
          <ChainOfThoughtStep>
            Step 1: Analyze the requirements
          </ChainOfThoughtStep>
          <ChainOfThoughtStep>
            Step 2: Identify potential solutions
          </ChainOfThoughtStep>
          <ChainOfThoughtStep>
            Step 3: Evaluate each solution
          </ChainOfThoughtStep>
          <ChainOfThoughtStep>
            Step 4: Select the best approach
          </ChainOfThoughtStep>
        </ChainOfThoughtContent>
      </ChainOfThought>
    </div>
  ),
};

export const LongReasoning: Story = {
  render: () => (
    <div className="max-w-2xl">
      <ChainOfThought defaultOpen={true}>
        <ChainOfThoughtHeader>Detailed Analysis</ChainOfThoughtHeader>
        <ChainOfThoughtContent>
          <ChainOfThoughtStep>
            To solve this problem, I first need to understand what the user is
            asking for. The problem involves multiple steps and requires careful
            consideration of each aspect.
          </ChainOfThoughtStep>
          <ChainOfThoughtStep>
            Next, I'll examine the constraints and requirements. This will help
            me narrow down the possible approaches and identify the most
            suitable solution.
          </ChainOfThoughtStep>
          <ChainOfThoughtStep>
            After analyzing the options, I'll implement the solution step by
            step, ensuring each part works correctly before moving to the next.
          </ChainOfThoughtStep>
          <ChainOfThoughtStep>
            Finally, I'll verify the solution meets all requirements and test it
            with various inputs to ensure robustness.
          </ChainOfThoughtStep>
        </ChainOfThoughtContent>
      </ChainOfThought>
    </div>
  ),
};

