import type { Meta, StoryObj } from '@storybook/react';
import {
  ModelSelector,
  ModelSelectorTrigger,
  ModelSelectorContent,
  ModelSelectorInput,
  ModelSelectorList,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorItem,
  ModelSelectorShortcut,
} from './model-selector';
import { Button } from '../shadcn/button';
import { useState } from 'react';

const meta: Meta<typeof ModelSelector> = {
  title: 'AI Elements/ModelSelector',
  component: ModelSelector,
};

export default meta;
type Story = StoryObj<typeof ModelSelector>;

const models = [
  { value: 'gpt-4', label: 'GPT-4', shortcut: '⌘1' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', shortcut: '⌘2' },
  { value: 'claude-3-opus', label: 'Claude 3 Opus', shortcut: '⌘3' },
  { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet', shortcut: '⌘4' },
];

export const Simple: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    const [selectedModel, setSelectedModel] = useState('gpt-4');

    return (
      <div className="max-w-md">
        <ModelSelector open={open} onOpenChange={setOpen}>
          <ModelSelectorTrigger asChild>
            <Button variant="outline">
              {models.find((m) => m.value === selectedModel)?.label ||
                'Select Model'}
            </Button>
          </ModelSelectorTrigger>
          <ModelSelectorContent>
            <ModelSelectorInput placeholder="Search models..." />
            <ModelSelectorList>
              <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
              <ModelSelectorGroup>
                {models.map((model) => (
                  <ModelSelectorItem
                    key={model.value}
                    value={model.value}
                    onSelect={() => {
                      setSelectedModel(model.value);
                      setOpen(false);
                    }}
                  >
                    {model.label}
                    <ModelSelectorShortcut>
                      {model.shortcut}
                    </ModelSelectorShortcut>
                  </ModelSelectorItem>
                ))}
              </ModelSelectorGroup>
            </ModelSelectorList>
          </ModelSelectorContent>
        </ModelSelector>
      </div>
    );
  },
};

export const WithGroups: Story = {
  render: () => {
    const [open, setOpen] = useState(false);

    const openaiModels = [
      { value: 'gpt-4', label: 'GPT-4' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    ];

    const anthropicModels = [
      { value: 'claude-3-opus', label: 'Claude 3 Opus' },
      { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
    ];

    return (
      <div className="max-w-md">
        <ModelSelector open={open} onOpenChange={setOpen}>
          <ModelSelectorTrigger asChild>
            <Button variant="outline">Select Model</Button>
          </ModelSelectorTrigger>
          <ModelSelectorContent>
            <ModelSelectorInput placeholder="Search models..." />
            <ModelSelectorList>
              <ModelSelectorGroup label="OpenAI">
                {openaiModels.map((model) => (
                  <ModelSelectorItem
                    key={model.value}
                    value={model.value}
                    onSelect={() => setOpen(false)}
                  >
                    {model.label}
                  </ModelSelectorItem>
                ))}
              </ModelSelectorGroup>
              <ModelSelectorGroup label="Anthropic">
                {anthropicModels.map((model) => (
                  <ModelSelectorItem
                    key={model.value}
                    value={model.value}
                    onSelect={() => setOpen(false)}
                  >
                    {model.label}
                  </ModelSelectorItem>
                ))}
              </ModelSelectorGroup>
            </ModelSelectorList>
          </ModelSelectorContent>
        </ModelSelector>
      </div>
    );
  },
};
