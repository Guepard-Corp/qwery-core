import type { Meta, StoryObj } from '@storybook/react';
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from './tool';

const meta: Meta<typeof Tool> = {
  title: 'AI Elements/Tool',
  component: Tool,
};

export default meta;
type Story = StoryObj<typeof Tool>;

export const Pending: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Tool defaultOpen={false}>
        <ToolHeader
          title="search_web"
          type="tool-search_web"
          state="input-streaming"
        />
        <ToolContent>
          <ToolInput input={{ query: 'React hooks' }} />
        </ToolContent>
      </Tool>
    </div>
  ),
};

export const Running: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Tool defaultOpen={true}>
        <ToolHeader
          title="calculate"
          type="tool-calculate"
          state="input-available"
        />
        <ToolContent>
          <ToolInput input={{ expression: '2 + 2' }} />
        </ToolContent>
      </Tool>
    </div>
  ),
};

export const Completed: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Tool defaultOpen={true}>
        <ToolHeader
          title="calculate"
          type="tool-calculate"
          state="output-available"
        />
        <ToolContent>
          <ToolInput input={{ expression: '2 + 2' }} />
          <ToolOutput output={4} />
        </ToolContent>
      </Tool>
    </div>
  ),
};

export const WithError: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Tool defaultOpen={true}>
        <ToolHeader
          title="fetch_data"
          type="tool-fetch_data"
          state="output-error"
        />
        <ToolContent>
          <ToolInput input={{ url: 'https://invalid-url' }} />
          <ToolOutput
            output={null}
            errorText="Failed to fetch data: Network error"
          />
        </ToolContent>
      </Tool>
    </div>
  ),
};

export const WithComplexOutput: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Tool defaultOpen={true}>
        <ToolHeader
          title="search_web"
          type="tool-search_web"
          state="output-available"
        />
        <ToolContent>
          <ToolInput input={{ query: 'React documentation' }} />
          <ToolOutput
            output={{
              results: [
                { title: 'React Docs', url: 'https://react.dev' },
                {
                  title: 'React GitHub',
                  url: 'https://github.com/facebook/react',
                },
              ],
            }}
          />
        </ToolContent>
      </Tool>
    </div>
  ),
};

export const ApprovalRequested: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Tool defaultOpen={true}>
        <ToolHeader
          title="delete_file"
          type="tool-delete_file"
          state="approval-requested"
        />
        <ToolContent>
          <ToolInput input={{ path: '/important/file.txt' }} />
        </ToolContent>
      </Tool>
    </div>
  ),
};
