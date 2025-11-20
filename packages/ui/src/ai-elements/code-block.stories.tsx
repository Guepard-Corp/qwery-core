import type { Meta, StoryObj } from '@storybook/react';
import { CodeBlock } from './code-block';

const meta: Meta<typeof CodeBlock> = {
  title: 'AI Elements/CodeBlock',
  component: CodeBlock,
};

export default meta;
type Story = StoryObj<typeof CodeBlock>;

const javascriptCode = `function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet('World'));`;

const pythonCode = `def greet(name):
    return f"Hello, {name}!"

print(greet('World'))`;

const jsonCode = `{
  "name": "John",
  "age": 30,
  "city": "New York"
}`;

export const JavaScript: Story = {
  render: () => (
    <div className="max-w-2xl">
      <CodeBlock code={javascriptCode} language="javascript" />
    </div>
  ),
};

export const WithLineNumbers: Story = {
  render: () => (
    <div className="max-w-2xl">
      <CodeBlock
        code={javascriptCode}
        language="javascript"
        showLineNumbers={true}
      />
    </div>
  ),
};

export const Python: Story = {
  render: () => (
    <div className="max-w-2xl">
      <CodeBlock code={pythonCode} language="python" />
    </div>
  ),
};

export const JSON: Story = {
  render: () => (
    <div className="max-w-2xl">
      <CodeBlock code={jsonCode} language="json" showLineNumbers={true} />
    </div>
  ),
};

export const TypeScript: Story = {
  render: () => {
    const tsCode = `interface User {
  name: string;
  age: number;
}

const user: User = {
  name: 'John',
  age: 30
};`;

    return (
      <div className="max-w-2xl">
        <CodeBlock code={tsCode} language="typescript" showLineNumbers={true} />
      </div>
    );
  },
};

export const LongCode: Story = {
  render: () => {
    const longCode = `import React from 'react';
import { useState, useEffect } from 'react';

interface CounterProps {
  initialValue?: number;
}

export function Counter({ initialValue = 0 }: CounterProps) {
  const [count, setCount] = useState(initialValue);

  useEffect(() => {
    document.title = \`Count: \${count}\`;
  }, [count]);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={() => setCount(count - 1)}>Decrement</button>
    </div>
  );
}`;

    return (
      <div className="max-w-2xl">
        <CodeBlock code={longCode} language="tsx" showLineNumbers={true} />
      </div>
    );
  },
};

