import type { TuiNotebook } from '../state/types.ts';
import { useStyles } from '../theme/index.ts';

interface NotebooksDialogProps {
  notebooks: TuiNotebook[];
  selectedIndex: number;
  width: number;
  height: number;
  createError?: string | null;
}

function formatDate(createdAt: string): string {
  if (!createdAt) return '—';
  try {
    const d = new Date(createdAt);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year:
        d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return '—';
  }
}

export function NotebooksDialog({
  notebooks,
  selectedIndex,
  width,
  height,
  createError = null,
}: NotebooksDialogProps) {
  const {
    colors,
    commandPaletteTitleStyle,
    commandPaletteShortcutStyle,
    commandPaletteItemStyle,
    commandPaletteItemSelectedStyle,
    messageInfoStyle,
  } = useStyles();

  const sorted = [...notebooks].sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return tb - ta;
  });

  const maxRows = Math.min(12, height - 12);
  const showNewRow = true;
  const listStart = showNewRow ? 1 : 0;
  const visibleNotebooks = sorted.slice(0, maxRows - listStart);

  return (
    <box
      flexDirection="column"
      width={width}
      height={height}
      justifyContent="center"
      alignItems="center"
    >
      <box
        flexDirection="column"
        width={Math.min(72, width - 4)}
        border={true}
        borderStyle="rounded"
        borderColor={colors.dimGray}
        paddingLeft={1}
        paddingRight={1}
      >
        <box flexDirection="row" paddingTop={0} paddingBottom={0}>
          <text {...commandPaletteTitleStyle}>Notebooks</text>
          <box flexGrow={1} />
          <text {...commandPaletteShortcutStyle}>Esc · n new</text>
        </box>
        <box height={1} />
        <box
          flexDirection="row"
          border={true}
          borderColor={colors.dimGray}
          paddingLeft={1}
          paddingRight={1}
        >
          <text {...messageInfoStyle}>Name</text>
          <box flexGrow={1} />
          <text {...messageInfoStyle}>Cells</text>
          <box width={2} />
          <text {...messageInfoStyle}>Created</text>
        </box>
        {showNewRow && (
          <box
            flexDirection="row"
            paddingLeft={1}
            paddingRight={1}
            border={true}
            borderColor={selectedIndex === 0 ? colors.orange : 'transparent'}
          >
            {selectedIndex === 0 ? (
              <text {...commandPaletteItemSelectedStyle}>+ New notebook</text>
            ) : (
              <text {...commandPaletteItemStyle}>+ New notebook</text>
            )}
          </box>
        )}
        {visibleNotebooks.length === 0 && !showNewRow ? (
          <text {...messageInfoStyle}>
            No notebooks yet. Create one from web.
          </text>
        ) : (
          visibleNotebooks.map((nb, i) => {
            const idx = listStart + i;
            const isSelected = idx === selectedIndex;
            const title =
              nb.title.length > 28 ? nb.title.slice(0, 25) + '...' : nb.title;
            const dateStr = formatDate(nb.createdAt);
            return (
              <box
                key={nb.id}
                flexDirection="row"
                paddingLeft={1}
                paddingRight={1}
                border={true}
                borderColor={isSelected ? colors.orange : 'transparent'}
              >
                {isSelected ? (
                  <text {...commandPaletteItemSelectedStyle}>
                    {title.padEnd(30)}
                  </text>
                ) : (
                  <text {...commandPaletteItemStyle}>{title}</text>
                )}
                <box flexGrow={1} />
                <text {...messageInfoStyle}>
                  {String(nb.cells.length).padStart(2)}
                </text>
                <box width={2} />
                <text {...messageInfoStyle}>{dateStr}</text>
              </box>
            );
          })
        )}
        {sorted.length > visibleNotebooks.length && (
          <text {...messageInfoStyle}>
            ... and {sorted.length - visibleNotebooks.length} more
          </text>
        )}
        {createError && (
          <box paddingLeft={1} paddingRight={1} paddingTop={0}>
            <text fg={colors.red}>{createError.slice(0, 55)}</text>
          </box>
        )}
        <box height={1} />
        <text {...messageInfoStyle}>
          Enter open · ↑↓ select · n = New notebook
        </text>
      </box>
    </box>
  );
}
