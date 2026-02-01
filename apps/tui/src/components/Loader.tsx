import { useStyles } from '../theme/index.ts';

const LOADER_BLOCK_COUNT = 6;
const LOADER_DOTS = '··';

interface LoaderProps {
  phase: number;
}

export function Loader({ phase }: LoaderProps) {
  const {
    loaderDotStyle,
    loaderBlockDimStyle,
    loaderBlockBrightStyle,
    loaderEscStyle,
    loaderInterruptStyle,
  } = useStyles();
  const blocks = [];
  for (let i = 0; i < LOADER_BLOCK_COUNT; i++) {
    const active = phase % LOADER_BLOCK_COUNT === i;
    blocks.push(
      <text
        key={i}
        {...(active ? loaderBlockBrightStyle : loaderBlockDimStyle)}
      >
        {'  '}
      </text>,
    );
  }
  return (
    <box flexDirection="row">
      <text {...loaderDotStyle}>{LOADER_DOTS}</text>
      <text> </text>
      {blocks}
      <text> </text>
      <text {...loaderEscStyle}>esc</text>
      <text {...loaderInterruptStyle}> interrupt</text>
    </box>
  );
}
