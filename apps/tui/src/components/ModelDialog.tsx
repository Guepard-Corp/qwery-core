import type { AppState } from '../state/types.ts';
import { useStyles } from '../theme/index.ts';

const MODELS = [
  { id: 'qwery-engine', name: 'Qwery Engine', desc: 'Default model' },
  { id: 'mock', name: 'Mock', desc: 'Demo responses' },
];

interface ModelDialogProps {
  state: AppState;
}

export function ModelDialog({ state }: ModelDialogProps) {
  const {
    colors,
    commandPaletteTitleStyle,
    commandPaletteShortcutStyle,
    commandPaletteItemStyle,
    commandPaletteItemSelectedStyle,
    messageInfoStyle,
  } = useStyles();

  return (
    <box
      flexDirection="column"
      width={state.width}
      height={state.height}
      justifyContent="center"
      alignItems="center"
    >
      <box
        flexDirection="column"
        width={50}
        border={true}
        borderStyle="rounded"
        borderColor={colors.dimGray}
        paddingLeft={1}
        paddingRight={1}
      >
        <box flexDirection="row">
          <text {...commandPaletteTitleStyle}>Model</text>
          <box flexGrow={1} />
          <text {...commandPaletteShortcutStyle}>esc</text>
        </box>
        <box height={1} />
        {MODELS.map((model, i) => {
          const isSelected = i === state.modelDialogSelected;
          return (
            <box key={model.id} flexDirection="column">
              {isSelected ? (
                <text {...commandPaletteItemSelectedStyle}>
                  {model.name} · {model.desc}
                </text>
              ) : (
                <>
                  <text {...commandPaletteItemStyle}>{model.name}</text>
                  <text {...messageInfoStyle}> {model.desc}</text>
                </>
              )}
            </box>
          );
        })}
        <box height={1} />
        <text {...messageInfoStyle}>Enter to select</text>
      </box>
    </box>
  );
}
