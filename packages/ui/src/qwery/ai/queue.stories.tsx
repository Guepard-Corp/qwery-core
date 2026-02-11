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
  QueueItemAttachment,
  QueueItemFile,
  type QueueTodo,
} from './queue';

const meta: Meta<typeof Queue> = {
  title: 'Qwery/AI/Queue',
  component: Queue,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Queue>;

const sampleTodos: QueueTodo[] = [
  {
    id: '1',
    title: 'Parse query',
    description: 'Understanding the request',
    status: 'completed',
  },
  {
    id: '2',
    title: 'Connect to datasource',
    description: 'Loading schema',
    status: 'completed',
  },
  {
    id: '3',
    title: 'Execute & validate',
    description: 'Running the query',
    status: 'pending',
  },
  { id: '4', title: 'Return results', status: 'pending' },
];

export const Default: Story = {
  render: () => (
    <div className="bg-background w-full max-w-md p-6">
      <Queue>
        <QueueSection defaultOpen>
          <QueueSectionTrigger>
            <QueueSectionLabel count={4} label="tasks" />
          </QueueSectionTrigger>
          <QueueSectionContent>
            <QueueList>
              {sampleTodos.map((todo) => (
                <QueueItem key={todo.id}>
                  <div className="flex items-start gap-2">
                    <QueueItemIndicator
                      completed={todo.status === 'completed'}
                    />
                    <div className="min-w-0 flex-1">
                      <QueueItemContent completed={todo.status === 'completed'}>
                        {todo.title}
                      </QueueItemContent>
                      {todo.description ? (
                        <QueueItemDescription
                          completed={todo.status === 'completed'}
                        >
                          {todo.description}
                        </QueueItemDescription>
                      ) : null}
                    </div>
                  </div>
                </QueueItem>
              ))}
            </QueueList>
          </QueueSectionContent>
        </QueueSection>
      </Queue>
    </div>
  ),
};

export const WithAttachments: Story = {
  render: () => (
    <div className="bg-background w-full max-w-md p-6">
      <Queue>
        <QueueSection defaultOpen>
          <QueueSectionTrigger>
            <QueueSectionLabel count={2} label="items" />
          </QueueSectionTrigger>
          <QueueSectionContent>
            <QueueList>
              <QueueItem>
                <div className="flex items-start gap-2">
                  <QueueItemIndicator completed={false} />
                  <div className="min-w-0 flex-1">
                    <QueueItemContent completed={false}>
                      Process data.csv
                    </QueueItemContent>
                    <QueueItemAttachment>
                      <QueueItemFile>data.csv</QueueItemFile>
                    </QueueItemAttachment>
                  </div>
                </div>
              </QueueItem>
              <QueueItem>
                <div className="flex items-start gap-2">
                  <QueueItemIndicator completed={true} />
                  <div className="min-w-0 flex-1">
                    <QueueItemContent completed={true}>
                      Upload complete
                    </QueueItemContent>
                  </div>
                </div>
              </QueueItem>
            </QueueList>
          </QueueSectionContent>
        </QueueSection>
      </Queue>
    </div>
  ),
};

export const Collapsed: Story = {
  render: () => (
    <div className="bg-background w-full max-w-md p-6">
      <Queue>
        <QueueSection defaultOpen={false}>
          <QueueSectionTrigger>
            <QueueSectionLabel count={3} label="queued" />
          </QueueSectionTrigger>
          <QueueSectionContent>
            <QueueList>
              {sampleTodos.slice(0, 3).map((todo) => (
                <QueueItem key={todo.id}>
                  <div className="flex items-start gap-2">
                    <QueueItemIndicator
                      completed={todo.status === 'completed'}
                    />
                    <QueueItemContent completed={todo.status === 'completed'}>
                      {todo.title}
                    </QueueItemContent>
                  </div>
                </QueueItem>
              ))}
            </QueueList>
          </QueueSectionContent>
        </QueueSection>
      </Queue>
    </div>
  ),
};
