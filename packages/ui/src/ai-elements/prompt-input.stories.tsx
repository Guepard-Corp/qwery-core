import type { Meta, StoryObj } from '@storybook/react';
import {
  PromptInput,
  PromptInputHeader,
  PromptInputAttachments,
  PromptInputAttachment,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionAddAttachments,
  PromptInputButton,
  PromptInputSelect,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSubmit,
} from './prompt-input';
import { useState } from 'react';
import { GlobeIcon } from 'lucide-react';

const meta: Meta<typeof PromptInput> = {
  title: 'AI Elements/PromptInput',
  component: PromptInput,
};

export default meta;
type Story = StoryObj<typeof PromptInput>;

export const Simple: Story = {
  render: () => {
    const [input, setInput] = useState('');

    return (
      <div className="max-w-2xl">
        <PromptInput
          onSubmit={(message) => {
            console.log('Submitted:', message);
            setInput('');
          }}
        >
          <PromptInputBody>
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputSubmit />
          </PromptInputFooter>
        </PromptInput>
      </div>
    );
  },
};

export const WithAttachments: Story = {
  render: () => {
    const [input, setInput] = useState('');

    return (
      <div className="max-w-2xl">
        <PromptInput
          onSubmit={(message) => {
            console.log('Submitted:', message);
            setInput('');
          }}
          globalDrop
          multiple
        >
          <PromptInputHeader>
            <PromptInputAttachments>
              {(attachment) => <PromptInputAttachment data={attachment} />}
            </PromptInputAttachments>
          </PromptInputHeader>
          <PromptInputBody>
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
            </PromptInputTools>
            <PromptInputSubmit />
          </PromptInputFooter>
        </PromptInput>
      </div>
    );
  },
};

export const WithTools: Story = {
  render: () => {
    const [input, setInput] = useState('');
    const [webSearch, setWebSearch] = useState(false);
    const [model, setModel] = useState('gpt-4');

    const models = [
      { name: 'GPT-4', value: 'gpt-4' },
      { name: 'GPT-3.5', value: 'gpt-3.5-turbo' },
      { name: 'Claude', value: 'claude-3-opus' },
    ];

    return (
      <div className="max-w-2xl">
        <PromptInput
          onSubmit={(message) => {
            console.log('Submitted:', message, { model, webSearch });
            setInput('');
          }}
        >
          <PromptInputBody>
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
              <PromptInputButton
                variant={webSearch ? 'default' : 'ghost'}
                onClick={() => setWebSearch(!webSearch)}
              >
                <GlobeIcon size={16} />
                <span>Search</span>
              </PromptInputButton>
              <PromptInputSelect value={model} onValueChange={setModel}>
                <PromptInputSelectTrigger>
                  <PromptInputSelectValue />
                </PromptInputSelectTrigger>
                <PromptInputSelectContent>
                  {models.map((m) => (
                    <PromptInputSelectItem key={m.value} value={m.value}>
                      {m.name}
                    </PromptInputSelectItem>
                  ))}
                </PromptInputSelectContent>
              </PromptInputSelect>
            </PromptInputTools>
            <PromptInputSubmit />
          </PromptInputFooter>
        </PromptInput>
      </div>
    );
  },
};

export const FullFeatured: Story = {
  render: () => {
    const [input, setInput] = useState('');

    return (
      <div className="max-w-2xl">
        <PromptInput
          onSubmit={(message) => {
            console.log('Submitted:', message);
            setInput('');
          }}
          globalDrop
          multiple
        >
          <PromptInputHeader>
            <PromptInputAttachments>
              {(attachment) => <PromptInputAttachment data={attachment} />}
            </PromptInputAttachments>
          </PromptInputHeader>
          <PromptInputBody>
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
            </PromptInputTools>
            <PromptInputSubmit />
          </PromptInputFooter>
        </PromptInput>
      </div>
    );
  },
};
