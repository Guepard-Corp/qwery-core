import type { Meta, StoryObj } from '@storybook/react';
import {
  WebPreview,
  WebPreviewNavigation,
  WebPreviewNavigationButton,
  WebPreviewUrl,
  WebPreviewBody,
  WebPreviewConsole,
} from './web-preview';
import { ArrowLeftIcon, ArrowRightIcon, RefreshCwIcon } from 'lucide-react';

const meta: Meta<typeof WebPreview> = {
  title: 'AI Elements/WebPreview',
  component: WebPreview,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof WebPreview>;

export const Simple: Story = {
  render: () => (
    <div className="h-screen w-full">
      <WebPreview defaultUrl="https://example.com">
        <WebPreviewNavigation>
          <WebPreviewNavigationButton tooltip="Back">
            <ArrowLeftIcon className="size-4" />
          </WebPreviewNavigationButton>
          <WebPreviewNavigationButton tooltip="Forward">
            <ArrowRightIcon className="size-4" />
          </WebPreviewNavigationButton>
          <WebPreviewNavigationButton tooltip="Refresh">
            <RefreshCwIcon className="size-4" />
          </WebPreviewNavigationButton>
          <WebPreviewUrl />
        </WebPreviewNavigation>
        <WebPreviewBody />
      </WebPreview>
    </div>
  ),
};

export const WithConsole: Story = {
  render: () => (
    <div className="h-screen w-full">
      <WebPreview defaultUrl="https://example.com">
        <WebPreviewNavigation>
          <WebPreviewNavigationButton tooltip="Back">
            <ArrowLeftIcon className="size-4" />
          </WebPreviewNavigationButton>
          <WebPreviewNavigationButton tooltip="Forward">
            <ArrowRightIcon className="size-4" />
          </WebPreviewNavigationButton>
          <WebPreviewNavigationButton tooltip="Refresh">
            <RefreshCwIcon className="size-4" />
          </WebPreviewNavigationButton>
          <WebPreviewUrl />
        </WebPreviewNavigation>
        <WebPreviewBody />
        <WebPreviewConsole
          logs={[
            {
              level: 'log',
              message: 'Page loaded successfully',
              timestamp: new Date(),
            },
            {
              level: 'warn',
              message: 'Deprecated API used',
              timestamp: new Date(),
            },
            {
              level: 'error',
              message: 'Failed to load resource',
              timestamp: new Date(),
            },
          ]}
        />
      </WebPreview>
    </div>
  ),
};

export const EmptyConsole: Story = {
  render: () => (
    <div className="h-screen w-full">
      <WebPreview defaultUrl="https://example.com">
        <WebPreviewNavigation>
          <WebPreviewNavigationButton tooltip="Back">
            <ArrowLeftIcon className="size-4" />
          </WebPreviewNavigationButton>
          <WebPreviewNavigationButton tooltip="Forward">
            <ArrowRightIcon className="size-4" />
          </WebPreviewNavigationButton>
          <WebPreviewNavigationButton tooltip="Refresh">
            <RefreshCwIcon className="size-4" />
          </WebPreviewNavigationButton>
          <WebPreviewUrl />
        </WebPreviewNavigation>
        <WebPreviewBody />
        <WebPreviewConsole logs={[]} />
      </WebPreview>
    </div>
  ),
};

export const CustomUrl: Story = {
  render: () => (
    <div className="h-screen w-full">
      <WebPreview defaultUrl="https://react.dev">
        <WebPreviewNavigation>
          <WebPreviewNavigationButton tooltip="Back">
            <ArrowLeftIcon className="size-4" />
          </WebPreviewNavigationButton>
          <WebPreviewNavigationButton tooltip="Forward">
            <ArrowRightIcon className="size-4" />
          </WebPreviewNavigationButton>
          <WebPreviewNavigationButton tooltip="Refresh">
            <RefreshCwIcon className="size-4" />
          </WebPreviewNavigationButton>
          <WebPreviewUrl />
        </WebPreviewNavigation>
        <WebPreviewBody />
      </WebPreview>
    </div>
  ),
};

