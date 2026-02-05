import type { AppState, TuiNotebookCell } from '../state/types.ts';
import { useStyles } from '../theme/index.ts';

interface NotebookViewProps {
  state: AppState;
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + '...';
}

function formatQueryForDisplay(query: string, maxLines = 8): string {
  const trimmed = query.trim();
  if (!trimmed) return '(empty)';
  const lines = trimmed.split('\n');
  if (lines.length <= maxLines) return trimmed;
  return lines.slice(0, maxLines).join('\n') + '\n...';
}

export function NotebookView({ state }: NotebookViewProps) {
  const nb = state.currentNotebook;
  const {
    colors,
    commandPaletteItemStyle,
    commandPaletteItemSelectedStyle,
    messageInfoStyle,
    chatTitleStyle,
    redTextStyle,
    toolCallNameStyle,
  } = useStyles();

  if (!nb) return null;

  const cells = nb.cells;
  const focusedIdx = state.notebookFocusedCellIndex;
  const cellInput = state.notebookCellInput;
  const loadingCellId = state.notebookCellLoading;
  const results = state.notebookCellResults;
  const errors = state.notebookCellErrors;
  const datasourceNames = state.projectDatasources;
  const pickerOpen = state.notebookCellDatasourcePickerOpen;
  const pickerSelected = state.notebookCellDatasourcePickerSelected;
  const editingTitleCellId = state.notebookEditingCellTitle;
  const titleInput = state.notebookCellTitleInput;

  const getDatasourceName = (id: string) =>
    datasourceNames.find((d) => d.id === id)?.name ?? id;

  return (
    <box flexDirection="column" width={state.width} height={state.height}>
      <box
        flexDirection="row"
        paddingLeft={2}
        paddingRight={2}
        paddingTop={0}
        paddingBottom={0}
        border={true}
        borderColor={colors.dimGray}
      >
        <text {...chatTitleStyle}>Notebook: {truncate(nb.title, 40)}</text>
        <box flexGrow={1} />
        <text {...messageInfoStyle}>
          Esc close · ↑↓ cell · Ctrl+Enter run · Ctrl+O new cell · Ctrl+D
          datasource · F2 rename
        </text>
      </box>
      <box flexDirection="column" flexGrow={1} overflow="scroll">
        {cells.map((cell: TuiNotebookCell, i: number) => {
          const isFocused = i === focusedIdx;
          const isQuery = cell.cellType === 'query';
          const result = results[String(cell.cellId)];
          const error = errors[String(cell.cellId)];
          const isLoading = loadingCellId === cell.cellId;
          const dsName =
            cell.datasources?.[0] != null
              ? getDatasourceName(cell.datasources[0])
              : '—';

          return (
            <box
              key={cell.cellId}
              flexDirection="column"
              border={true}
              borderStyle="rounded"
              borderColor={isFocused ? colors.orange : colors.dimGray}
              marginTop={1}
              marginLeft={1}
              marginRight={1}
              paddingLeft={1}
              paddingRight={1}
              paddingTop={0}
              paddingBottom={0}
            >
              <box flexDirection="row">
                {editingTitleCellId === cell.cellId ? (
                  <text {...commandPaletteItemSelectedStyle}>
                    {(titleInput || '(unnamed)').slice(0, 30)}
                    {titleInput.length > 30 ? '...' : ''} · Enter save Esc cancel
                  </text>
                ) : isFocused ? (
                  <text {...commandPaletteItemSelectedStyle}>
                    {truncate(cell.title || `Cell ${cell.cellId}`, 24)}
                  </text>
                ) : (
                  <text {...commandPaletteItemStyle}>
                    {truncate(cell.title || `Cell ${cell.cellId}`, 24)}
                  </text>
                )}
                <box width={1} />
                <text {...toolCallNameStyle}>
                  {isQuery ? 'SQL' : (cell.cellType ?? 'text')}
                </text>
              </box>
              {isQuery && (
                <>
                  <box
                    flexDirection="column"
                    border={true}
                    borderColor={colors.dimGray}
                    paddingLeft={1}
                    paddingRight={1}
                    marginTop={0}
                  >
                    <text {...messageInfoStyle}>
                      {formatQueryForDisplay(
                        isFocused ? cellInput : (cell.query ?? ''),
                      )}
                    </text>
                  </box>
                  <box flexDirection="row" marginTop={0}>
                    <text {...messageInfoStyle}>
                      Datasource: {truncate(dsName, 24)}
                    </text>
                    <box flexGrow={1} />
                    <text {...messageInfoStyle}>
                      {isFocused ? 'Ctrl+Enter to run' : ''}
                    </text>
                  </box>
                  {isLoading && <text {...messageInfoStyle}>Running...</text>}
                  {error && !isLoading && (
                    <box
                      flexDirection="column"
                      border={true}
                      borderColor={colors.red}
                      paddingLeft={1}
                      marginTop={0}
                    >
                      <text {...redTextStyle}>{truncate(error, 60)}</text>
                    </box>
                  )}
                  {result && !isLoading && !error && (
                    <box
                      flexDirection="column"
                      border={true}
                      borderColor={colors.dimGray}
                      paddingLeft={1}
                      marginTop={0}
                    >
                      <text {...messageInfoStyle}>
                        {result.rows.length} row(s)
                        {result.headers.length
                          ? ` · ${result.headers.map((h) => h.name).join(', ')}`
                          : ''}
                      </text>
                      {result.rows.length > 0 &&
                        result.rows.length <= 10 &&
                        result.headers.length > 0 && (
                          <box flexDirection="column" marginTop={0}>
                            <text {...messageInfoStyle}>
                              {result.headers.map((h) => h.name).join(' | ')}
                            </text>
                            {result.rows.slice(0, 5).map((row, ri) => (
                              <text key={ri} {...messageInfoStyle}>
                                {result.headers
                                  .map((h) =>
                                    String(
                                      (row as Record<string, unknown>)[
                                        h.name
                                      ] ?? '',
                                    ),
                                  )
                                  .join(' | ')}
                              </text>
                            ))}
                            {result.rows.length > 5 && (
                              <text {...messageInfoStyle}>
                                ... +{result.rows.length - 5} more
                              </text>
                            )}
                          </box>
                        )}
                    </box>
                  )}
                </>
              )}
            </box>
          );
        })}
      </box>
      {pickerOpen && (
        <box
          flexDirection="column"
          border={true}
          borderColor={colors.orange}
          marginLeft={1}
          marginRight={1}
          marginTop={1}
          paddingLeft={1}
          paddingRight={1}
          paddingBottom={1}
        >
          <text {...messageInfoStyle}>
            Set cell datasource: ↑↓ select · Enter set · Esc cancel
          </text>
          {datasourceNames.length === 0 ? (
            <text {...messageInfoStyle}>No datasources in project.</text>
          ) : (
            datasourceNames.slice(0, 8).map((ds, i) => (
              <box key={ds.id} flexDirection="row">
                {i === pickerSelected ? (
                  <text {...commandPaletteItemSelectedStyle}>
                    {truncate(ds.name, 50)}
                  </text>
                ) : (
                  <text {...commandPaletteItemStyle}>
                    {truncate(ds.name, 50)}
                  </text>
                )}
              </box>
            ))
          )}
        </box>
      )}
    </box>
  );
}
