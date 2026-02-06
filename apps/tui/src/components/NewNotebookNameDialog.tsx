import type { AppState } from '../state/types.ts';
import { useStyles } from '../theme/index.ts';

interface NewNotebookNameDialogProps {
  state: AppState;
}

export function NewNotebookNameDialog({ state }: NewNotebookNameDialogProps) {
  const {
    colors,
    commandPaletteTitleStyle,
    commandPaletteShortcutStyle,
    messageInfoStyle,
    commandPaletteItemStyle,
  } = useStyles();

  const display =
    state.newNotebookNameInput.length > 50
      ? state.newNotebookNameInput.slice(0, 47) + '...'
      : state.newNotebookNameInput;

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
          <text {...commandPaletteTitleStyle}>New notebook name</text>
          <box flexGrow={1} />
          <text {...commandPaletteShortcutStyle}>esc</text>
        </box>
        <box height={1} />
        <text {...messageInfoStyle}>Name:</text>
        <box
          flexDirection="row"
          border={true}
          borderColor={colors.dimGray}
          paddingLeft={1}
          paddingRight={1}
        >
          <text {...commandPaletteItemStyle}>{display || '(empty)'}</text>
        </box>
        <box height={1} />
        <text {...messageInfoStyle}>Type name · Enter create · Esc cancel</text>
      </box>
    </box>
  );
}
