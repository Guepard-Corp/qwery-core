import * as React from 'react';

import type { Meta, StoryObj } from '@storybook/react';
import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactDescription,
  ArtifactContent,
  ArtifactActions,
  ArtifactAction,
  ArtifactClose,
} from './artifact';
import { DownloadIcon, ShareIcon } from 'lucide-react';

const meta: Meta<typeof Artifact> = {
  title: 'AI Elements/Artifact',
  component: Artifact,
};

export default meta;
type Story = StoryObj<typeof Artifact>;

export const Simple: Story = {
  render: () => (
    <div className="max-w-md">
      <Artifact>
        <ArtifactHeader>
          <div>
            <ArtifactTitle>Document Title</ArtifactTitle>
            <ArtifactDescription>
              Created on January 1, 2024
            </ArtifactDescription>
          </div>
          <ArtifactClose />
        </ArtifactHeader>
        <ArtifactContent>
          <p>This is the content of the artifact.</p>
        </ArtifactContent>
      </Artifact>
    </div>
  ),
};

export const WithActions: Story = {
  render: () => (
    <div className="max-w-md">
      <Artifact>
        <ArtifactHeader>
          <div>
            <ArtifactTitle>Code Artifact</ArtifactTitle>
            <ArtifactDescription>Generated code snippet</ArtifactDescription>
          </div>
          <ArtifactActions>
            <ArtifactAction tooltip="Download" icon={DownloadIcon} />
            <ArtifactAction tooltip="Share" icon={ShareIcon} />
            <ArtifactClose />
          </ArtifactActions>
        </ArtifactHeader>
        <ArtifactContent>
          <pre className="text-sm">
            {`function hello() {
  console.log("Hello, World!");
}`}
          </pre>
        </ArtifactContent>
      </Artifact>
    </div>
  ),
};

export const FullExample: Story = {
  render: () => (
    <div className="max-w-2xl space-y-4">
      <Artifact>
        <ArtifactHeader>
          <div>
            <ArtifactTitle>React Component</ArtifactTitle>
            <ArtifactDescription>
              Generated React component code
            </ArtifactDescription>
          </div>
          <ArtifactActions>
            <ArtifactAction tooltip="Download" icon={DownloadIcon} />
            <ArtifactAction tooltip="Share" icon={ShareIcon} />
            <ArtifactClose />
          </ArtifactActions>
        </ArtifactHeader>
        <ArtifactContent>
          <pre className="overflow-x-auto text-sm">
            {`export function Button({ children, onClick }) {
  return (
    <button onClick={onClick}>
      {children}
    </button>
  );
}`}
          </pre>
        </ArtifactContent>
      </Artifact>
    </div>
  ),
};
