import type { Meta, StoryObj } from '@storybook/react';
import { Reasoning, ReasoningTrigger, ReasoningContent } from './reasoning';

const meta: Meta<typeof Reasoning> = {
  title: 'AI Elements/Reasoning',
  component: Reasoning,
};

export default meta;
type Story = StoryObj<typeof Reasoning>;

export const Simple: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Reasoning defaultOpen={true}>
        <ReasoningTrigger />
        <ReasoningContent>
          I need to think about this problem step by step. First, I'll analyze
          the requirements, then consider possible solutions, and finally select
          the best approach.
        </ReasoningContent>
      </Reasoning>
    </div>
  ),
};

export const Collapsed: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Reasoning defaultOpen={false}>
        <ReasoningTrigger />
        <ReasoningContent>
          This reasoning content is collapsed by default. Click the trigger to
          expand and see the full reasoning process.
        </ReasoningContent>
      </Reasoning>
    </div>
  ),
};

export const Streaming: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Reasoning defaultOpen={true} isStreaming={true}>
        <ReasoningTrigger />
        <ReasoningContent>
          I'm currently thinking about this problem. The reasoning is being
          streamed in real-time as I process the information.
        </ReasoningContent>
      </Reasoning>
    </div>
  ),
};

export const LongReasoning: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Reasoning defaultOpen={true}>
        <ReasoningTrigger />
        <ReasoningContent>
          To solve this complex problem, I need to break it down into several
          key components. First, I'll examine the input requirements and
          constraints. Then, I'll identify the core challenges and potential
          approaches. After evaluating each approach against the requirements,
          I'll select the most suitable solution and implement it step by step.
          Finally, I'll verify the solution meets all the specified criteria and
          test it with various inputs to ensure robustness and reliability.
        </ReasoningContent>
      </Reasoning>
    </div>
  ),
};

export const WithDuration: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Reasoning defaultOpen={true} duration={5}>
        <ReasoningTrigger />
        <ReasoningContent>
          This reasoning took 5 seconds to complete. The duration is displayed
          in the trigger.
        </ReasoningContent>
      </Reasoning>
    </div>
  ),
};
