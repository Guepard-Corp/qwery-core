import type { AppState } from '../state/types.ts';
import { useStyles } from '../theme/index.ts';

interface AddDatasourceDialogProps {
  state: AppState;
}

export function AddDatasourceDialog({ state }: AddDatasourceDialogProps) {
  const {
    colors,
    commandPaletteTitleStyle,
    commandPaletteShortcutStyle,
    commandPaletteItemStyle,
    commandPaletteItemSelectedStyle,
    messageInfoStyle,
  } = useStyles();

  const step = state.addDatasourceStep;
  const maxItems = Math.min(12, state.height - 12);

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
        width={60}
        border={true}
        borderStyle="rounded"
        borderColor={colors.dimGray}
        paddingLeft={1}
        paddingRight={1}
      >
        <box flexDirection="row">
          <text {...commandPaletteTitleStyle}>
            Add datasource {step === 'form' ? '- config' : ''}
          </text>
          <box flexGrow={1} />
          <text {...commandPaletteShortcutStyle}>esc</text>
        </box>
        <box height={1} />
        {step === 'type' ? (
          state.addDatasourceTypeIds.length === 0 ? (
            <text {...messageInfoStyle}>Loading types...</text>
          ) : (
            state.addDatasourceTypeNames.slice(0, maxItems).map((name, i) => {
              const isSelected = i === state.addDatasourceTypeSelected;
              const display =
                name.length > 50 ? name.slice(0, 47) + '...' : name;
              return (
                <box key={state.addDatasourceTypeIds[i]} flexDirection="row">
                  {isSelected ? (
                    <text {...commandPaletteItemSelectedStyle}>{display}</text>
                  ) : (
                    <text {...commandPaletteItemStyle}>{display}</text>
                  )}
                </box>
              );
            })
          )
        ) : (
          <>
            <box flexDirection="row">
              <text {...commandPaletteItemStyle}>Name: </text>
              {state.addDatasourceFormSelected === 0 ? (
                <text {...commandPaletteItemSelectedStyle}>
                  {state.addDatasourceName || ' '}
                </text>
              ) : (
                <text {...commandPaletteItemStyle}>
                  {state.addDatasourceName || ' '}
                </text>
              )}
            </box>
            <box flexDirection="row">
              <text {...commandPaletteItemStyle}>Connection: </text>
              {state.addDatasourceFormSelected === 1 ? (
                <text {...commandPaletteItemSelectedStyle}>
                  {state.addDatasourceConnection || ' '}
                </text>
              ) : (
                <text {...commandPaletteItemStyle}>
                  {state.addDatasourceConnection || ' '}
                </text>
              )}
            </box>
            <box flexDirection="row" marginTop={1} gap={1}>
              <text
                {...(state.addDatasourceFormSelected === 2
                  ? commandPaletteItemSelectedStyle
                  : commandPaletteItemStyle)}
              >
                [Test connection]
              </text>
              <text
                {...(state.addDatasourceFormSelected === 3
                  ? commandPaletteItemSelectedStyle
                  : commandPaletteItemStyle)}
              >
                [Create]
              </text>
              <text
                {...(state.addDatasourceFormSelected === 4
                  ? commandPaletteItemSelectedStyle
                  : commandPaletteItemStyle)}
              >
                [Cancel]
              </text>
            </box>
            {state.addDatasourceValidationError ? (
              <box flexDirection="row" marginTop={1}>
                <text fg={colors.red}>
                  Validation: {state.addDatasourceValidationError}
                </text>
              </box>
            ) : null}
            {state.addDatasourceTestStatus === 'pending' ? (
              <box flexDirection="row" marginTop={1}>
                <text fg={colors.yellow}>Testing connection...</text>
              </box>
            ) : state.addDatasourceTestStatus === 'ok' &&
              state.addDatasourceTestMessage ? (
              <box flexDirection="row" marginTop={1}>
                <text fg={colors.green}>
                  Test OK: {state.addDatasourceTestMessage}
                </text>
              </box>
            ) : state.addDatasourceTestStatus === 'error' &&
              state.addDatasourceTestMessage ? (
              <box flexDirection="row" marginTop={1}>
                <text fg={colors.red}>
                  Test failed: {state.addDatasourceTestMessage}
                </text>
              </box>
            ) : null}
          </>
        )}
        <box height={1} />
        <text {...messageInfoStyle}>
          {step === 'type'
            ? 'Enter to select type · up/down to move'
            : 'up/down: fields & buttons · left/right: buttons · Enter: activate'}
        </text>
      </box>
    </box>
  );
}
