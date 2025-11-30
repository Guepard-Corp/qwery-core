import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import type { PromptInputMessage } from '../../ai-elements/prompt-input';
import QweryConversationInit from './init-conversation';

const meta: Meta<typeof QweryConversationInit> = {
  title: 'Qwery/AI/Conversation Init',
  component: QweryConversationInit,
};

export default meta;
type Story = StoryObj<typeof QweryConversationInit>;

const DefaultComponent = () => {
  const [input, setInput] = React.useState('');

  const handleSubmit = (message: PromptInputMessage) => {
    console.log('Submitted message:', message);
    setInput('');
  };

  return (
    <div className="bg-background min-h-screen p-8">
      <QweryConversationInit
        onSubmit={handleSubmit}
        input={input}
        setInput={setInput}
        status={undefined}
      />
    </div>
  );
};

export const Default: Story = {
  render: () => <DefaultComponent />,
};
