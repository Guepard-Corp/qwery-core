import type { Meta, StoryObj } from '@storybook/react';
import { Suggestions, Suggestion } from './suggestion';

const meta: Meta<typeof Suggestions> = {
  title: 'AI Elements/Suggestion',
  component: Suggestions,
};

export default meta;
type Story = StoryObj<typeof Suggestions>;

export const Simple: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Suggestions>
        <Suggestion suggestion="Tell me about React" />
        <Suggestion suggestion="Explain TypeScript" />
        <Suggestion suggestion="How to use hooks?" />
      </Suggestions>
    </div>
  ),
};

export const WithOnClick: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Suggestions>
        <Suggestion
          suggestion="What is React?"
          onClick={(suggestion) => alert(`Clicked: ${suggestion}`)}
        />
        <Suggestion
          suggestion="Explain hooks"
          onClick={(suggestion) => alert(`Clicked: ${suggestion}`)}
        />
        <Suggestion
          suggestion="Show examples"
          onClick={(suggestion) => alert(`Clicked: ${suggestion}`)}
        />
      </Suggestions>
    </div>
  ),
};

export const Highlighted: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Suggestions>
        <Suggestion suggestion="Regular suggestion" />
        <Suggestion suggestion="Highlighted suggestion" highlighted={true} />
        <Suggestion suggestion="Another regular suggestion" />
      </Suggestions>
    </div>
  ),
};

export const ManySuggestions: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Suggestions>
        <Suggestion suggestion="Suggestion 1" />
        <Suggestion suggestion="Suggestion 2" />
        <Suggestion suggestion="Suggestion 3" />
        <Suggestion suggestion="Suggestion 4" />
        <Suggestion suggestion="Suggestion 5" />
        <Suggestion suggestion="Suggestion 6" />
        <Suggestion suggestion="Suggestion 7" />
        <Suggestion suggestion="Suggestion 8" />
      </Suggestions>
    </div>
  ),
};

export const CustomContent: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Suggestions>
        <Suggestion suggestion="default">
          <span>Custom content 1</span>
        </Suggestion>
        <Suggestion suggestion="default">
          <span>Custom content 2</span>
        </Suggestion>
        <Suggestion suggestion="default">
          <span>Custom content 3</span>
        </Suggestion>
      </Suggestions>
    </div>
  ),
};

