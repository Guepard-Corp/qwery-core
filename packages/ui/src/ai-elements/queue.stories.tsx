import type { Meta, StoryObj } from '@storybook/react';
import {
  Queue,
  QueueSection,
  QueueSectionTrigger,
  QueueSectionLabel,
  QueueSectionContent,
  QueueList,
  QueueItem,
  QueueItemIndicator,
  QueueItemContent,
  QueueItemDescription,
  QueueItemActions,
  QueueItemAction,
  QueueItemAttachment,
  QueueItemFile,
} from './queue';
import { XIcon } from 'lucide-react';

const meta: Meta<typeof Queue> = {
  title: 'AI Elements/Queue',
  component: Queue,
};

export default meta;
type Story = StoryObj<typeof Queue>;

export const Simple: Story = {
  render: () => (
    <div className="max-w-md">
      <Queue>
        <QueueSection defaultOpen={true}>
          <QueueSectionTrigger>
            <QueueSectionLabel label="messages" count={3} />
          </QueueSectionTrigger>
          <QueueSectionContent>
            <QueueList>
              <QueueItem>
                <QueueItemIndicator />
                <QueueItemContent>Message 1</QueueItemContent>
                <QueueItemActions>
                  <QueueItemAction>
                    <XIcon className="size-3" />
                  </QueueItemAction>
                </QueueItemActions>
              </QueueItem>
              <QueueItem>
                <QueueItemIndicator />
                <QueueItemContent>Message 2</QueueItemContent>
                <QueueItemActions>
                  <QueueItemAction>
                    <XIcon className="size-3" />
                  </QueueItemAction>
                </QueueItemActions>
              </QueueItem>
              <QueueItem>
                <QueueItemIndicator completed={true} />
                <QueueItemContent completed={true}>Message 3</QueueItemContent>
                <QueueItemActions>
                  <QueueItemAction>
                    <XIcon className="size-3" />
                  </QueueItemAction>
                </QueueItemActions>
              </QueueItem>
            </QueueList>
          </QueueSectionContent>
        </QueueSection>
      </Queue>
    </div>
  ),
};

export const WithAttachments: Story = {
  render: () => (
    <div className="max-w-md">
      <Queue>
        <QueueSection defaultOpen={true}>
          <QueueSectionTrigger>
            <QueueSectionLabel label="items" count={2} />
          </QueueSectionTrigger>
          <QueueSectionContent>
            <QueueList>
              <QueueItem>
                <QueueItemIndicator />
                <QueueItemContent>Processing document.pdf</QueueItemContent>
                <QueueItemAttachment>
                  <QueueItemFile>document.pdf</QueueItemFile>
                </QueueItemAttachment>
                <QueueItemActions>
                  <QueueItemAction>
                    <XIcon className="size-3" />
                  </QueueItemAction>
                </QueueItemActions>
              </QueueItem>
              <QueueItem>
                <QueueItemIndicator />
                <QueueItemContent>Processing image.jpg</QueueItemContent>
                <QueueItemAttachment>
                  <QueueItemFile>image.jpg</QueueItemFile>
                </QueueItemAttachment>
                <QueueItemActions>
                  <QueueItemAction>
                    <XIcon className="size-3" />
                  </QueueItemAction>
                </QueueItemActions>
              </QueueItem>
            </QueueList>
          </QueueSectionContent>
        </QueueSection>
      </Queue>
    </div>
  ),
};

export const WithDescriptions: Story = {
  render: () => (
    <div className="max-w-md">
      <Queue>
        <QueueSection defaultOpen={true}>
          <QueueSectionTrigger>
            <QueueSectionLabel label="tasks" count={3} />
          </QueueSectionTrigger>
          <QueueSectionContent>
            <QueueList>
              <QueueItem>
                <QueueItemIndicator />
                <QueueItemContent>Task 1</QueueItemContent>
                <QueueItemDescription>This is a description</QueueItemDescription>
                <QueueItemActions>
                  <QueueItemAction>
                    <XIcon className="size-3" />
                  </QueueItemAction>
                </QueueItemActions>
              </QueueItem>
              <QueueItem>
                <QueueItemIndicator />
                <QueueItemContent>Task 2</QueueItemContent>
                <QueueItemDescription>
                  Another task with a longer description that might wrap
                </QueueItemDescription>
                <QueueItemActions>
                  <QueueItemAction>
                    <XIcon className="size-3" />
                  </QueueItemAction>
                </QueueItemActions>
              </QueueItem>
              <QueueItem>
                <QueueItemIndicator completed={true} />
                <QueueItemContent completed={true}>Task 3</QueueItemContent>
                <QueueItemDescription completed={true}>
                  Completed task
                </QueueItemDescription>
                <QueueItemActions>
                  <QueueItemAction>
                    <XIcon className="size-3" />
                  </QueueItemAction>
                </QueueItemActions>
              </QueueItem>
            </QueueList>
          </QueueSectionContent>
        </QueueSection>
      </Queue>
    </div>
  ),
};

export const MultipleSections: Story = {
  render: () => (
    <div className="max-w-md">
      <Queue>
        <QueueSection defaultOpen={true}>
          <QueueSectionTrigger>
            <QueueSectionLabel label="pending" count={2} />
          </QueueSectionTrigger>
          <QueueSectionContent>
            <QueueList>
              <QueueItem>
                <QueueItemIndicator />
                <QueueItemContent>Pending item 1</QueueItemContent>
              </QueueItem>
              <QueueItem>
                <QueueItemIndicator />
                <QueueItemContent>Pending item 2</QueueItemContent>
              </QueueItem>
            </QueueList>
          </QueueSectionContent>
        </QueueSection>
        <QueueSection defaultOpen={false}>
          <QueueSectionTrigger>
            <QueueSectionLabel label="completed" count={1} />
          </QueueSectionTrigger>
          <QueueSectionContent>
            <QueueList>
              <QueueItem>
                <QueueItemIndicator completed={true} />
                <QueueItemContent completed={true}>
                  Completed item
                </QueueItemContent>
              </QueueItem>
            </QueueList>
          </QueueSectionContent>
        </QueueSection>
      </Queue>
    </div>
  ),
};

