import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import type { PromptInputMessage } from '../../ai-elements/prompt-input';
import QweryPromptInput from './prompt-input';

const meta: Meta<typeof QweryPromptInput> = {
  title: 'Qwery/AI/Prompt Input',
  component: QweryPromptInput,
};

export default meta;
type Story = StoryObj<typeof QweryPromptInput>;

const DefaultComponent = () => {
  const [input, setInput] = React.useState('');
  const [model, setModel] = React.useState('gpt-4');

  const models = [
    { name: 'GPT-4', value: 'gpt-4' },
    { name: 'GPT-3.5', value: 'gpt-3.5-turbo' },
    { name: 'Claude 3', value: 'claude-3-opus' },
  ];

  const handleSubmit = (message: PromptInputMessage) => {
    console.log('Submitted message:', message);
    setInput('');
  };

  return (
    <div className="bg-background min-h-screen p-8">
      <QweryPromptInput
        onSubmit={handleSubmit}
        input={input}
        setInput={setInput}
        model={model}
        setModel={setModel}
        models={models}
        status={undefined}
      />
    </div>
  );
};

export const Default: Story = {
  render: () => <DefaultComponent />,
};
