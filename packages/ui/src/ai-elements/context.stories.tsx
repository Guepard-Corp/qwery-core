import type { Meta, StoryObj } from '@storybook/react';
import {
  Context,
  ContextTrigger,
  ContextContent,
  ContextContentHeader,
  ContextContentBody,
  ContextContentFooter,
  ContextInputUsage,
  ContextOutputUsage,
} from './context';

const meta: Meta<typeof Context> = {
  title: 'AI Elements/Context',
  component: Context,
};

export default meta;
type Story = StoryObj<typeof Context>;

export const Simple: Story = {
  render: () => (
    <div className="max-w-md">
      <Context usedTokens={1500} maxTokens={4000} modelId="gpt-4">
        <ContextTrigger />
        <ContextContent>
          <ContextContentHeader />
          <ContextContentBody>
            <ContextInputUsage />
            <ContextOutputUsage />
          </ContextContentBody>
          <ContextContentFooter />
        </ContextContent>
      </Context>
    </div>
  ),
};

export const HighUsage: Story = {
  render: () => (
    <div className="max-w-md">
      <Context
        usedTokens={3500}
        maxTokens={4000}
        modelId="gpt-4"
        usage={{
          inputTokens: 2000,
          outputTokens: 1500,
        }}
      >
        <ContextTrigger />
        <ContextContent>
          <ContextContentHeader />
          <ContextContentBody>
            <ContextInputUsage />
            <ContextOutputUsage />
          </ContextContentBody>
          <ContextContentFooter />
        </ContextContent>
      </Context>
    </div>
  ),
};

export const WithReasoningTokens: Story = {
  render: () => (
    <div className="max-w-md">
      <Context
        usedTokens={5000}
        maxTokens={8000}
        modelId="o1-preview"
        usage={{
          inputTokens: 2000,
          outputTokens: 2000,
          reasoningTokens: 1000,
        }}
      >
        <ContextTrigger />
        <ContextContent>
          <ContextContentHeader />
          <ContextContentBody>
            <ContextInputUsage />
            <ContextOutputUsage />
          </ContextContentBody>
          <ContextContentFooter />
        </ContextContent>
      </Context>
    </div>
  ),
};

export const LowUsage: Story = {
  render: () => (
    <div className="max-w-md">
      <Context
        usedTokens={500}
        maxTokens={4000}
        modelId="gpt-4"
        usage={{
          inputTokens: 300,
          outputTokens: 200,
        }}
      >
        <ContextTrigger />
        <ContextContent>
          <ContextContentHeader />
          <ContextContentBody>
            <ContextInputUsage />
            <ContextOutputUsage />
          </ContextContentBody>
          <ContextContentFooter />
        </ContextContent>
      </Context>
    </div>
  ),
};
