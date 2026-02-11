import { useStyles } from '../theme/index.ts';
import { Menu } from './Menu.tsx';
import { BlinkingCursor } from './BlinkingCursor.tsx';

const PROMPT_WIDTH = 60;

interface InputSectionProps {
  input: string;
  menuItems: string[];
  selectedIdx: number;
  width?: number;
}

export function InputSection({
  input,
  menuItems,
  selectedIdx,
  width,
}: InputSectionProps) {
  const {
    placeholderStyle,
    inputContainerStyle,
    inputBorderColorQuery,
    inputBorderColorAsk,
    colors,
  } = useStyles();
  const promptWidth =
    width != null
      ? Math.min(PROMPT_WIDTH, Math.max(20, width - 8))
      : PROMPT_WIDTH;

  const isQuery = selectedIdx === 0;
  const borderColor = isQuery ? inputBorderColorQuery : inputBorderColorAsk;
  const typedTextStyle = { fg: colors.white };

  const promptLine =
    input === '' ? (
      <text width={promptWidth}>
        <BlinkingCursor />
        <span {...placeholderStyle}>
          Ask your data... {'"'}Top 10 customers by revenue{'"'}
        </span>
      </text>
    ) : (
      <text width={promptWidth} wrapMode="char">
        <span {...typedTextStyle}>{input}</span>
        <BlinkingCursor />
      </text>
    );

  return (
    <box
      {...inputContainerStyle}
      borderColor={borderColor}
      flexDirection="column"
      width={promptWidth + 2}
      paddingLeft={1}
      paddingRight={1}
      paddingTop={0}
      paddingBottom={0}
    >
      {promptLine}
      <box height={1} />
      <Menu items={menuItems} selected={selectedIdx} />
    </box>
  );
}
