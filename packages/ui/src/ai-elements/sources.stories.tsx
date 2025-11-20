import type { Meta, StoryObj } from '@storybook/react';
import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
} from './sources';

const meta: Meta<typeof Sources> = {
  title: 'AI Elements/Sources',
  component: Sources,
};

export default meta;
type Story = StoryObj<typeof Sources>;

export const Simple: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Sources defaultOpen={false}>
        <SourcesTrigger count={1} />
        <SourcesContent>
          <Source
            href="https://example.com"
            title="Example Source"
          />
        </SourcesContent>
      </Sources>
    </div>
  ),
};

export const MultipleSources: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Sources defaultOpen={false}>
        <SourcesTrigger count={3} />
        <SourcesContent>
          <Source
            href="https://example.com/article1"
            title="Article 1: Introduction to React"
          />
          <Source
            href="https://example.com/article2"
            title="Article 2: Advanced React Patterns"
          />
          <Source
            href="https://example.com/article3"
            title="Article 3: React Best Practices"
          />
        </SourcesContent>
      </Sources>
    </div>
  ),
};

export const Expanded: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Sources defaultOpen={true}>
        <SourcesTrigger count={2} />
        <SourcesContent>
          <Source
            href="https://react.dev"
            title="React Documentation"
          />
          <Source
            href="https://nextjs.org"
            title="Next.js Documentation"
          />
        </SourcesContent>
      </Sources>
    </div>
  ),
};

export const ManySources: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Sources defaultOpen={false}>
        <SourcesTrigger count={5} />
        <SourcesContent>
          <Source
            href="https://example.com/1"
            title="Source 1"
          />
          <Source
            href="https://example.com/2"
            title="Source 2"
          />
          <Source
            href="https://example.com/3"
            title="Source 3"
          />
          <Source
            href="https://example.com/4"
            title="Source 4"
          />
          <Source
            href="https://example.com/5"
            title="Source 5"
          />
        </SourcesContent>
      </Sources>
    </div>
  ),
};

