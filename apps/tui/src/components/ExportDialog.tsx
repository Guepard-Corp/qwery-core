import type { AppState } from '../state/types.ts';
import { getCurrentConversation } from '../state/types.ts';
import { useStyles } from '../theme/index.ts';
import { formatConversationTranscript } from '../util/transcript.ts';
import { writeFile } from 'fs/promises';
import { join } from 'path';

interface ExportDialogProps {
  state: AppState;
}

export function ExportDialog({ state }: ExportDialogProps) {
  const {
    colors,
    commandPaletteTitleStyle,
    commandPaletteShortcutStyle,
    keyStyle,
    keyDescStyle,
    messageInfoStyle,
  } = useStyles();

  const conv = getCurrentConversation(state);
  const hasConversation = conv && conv.messages.length > 0;

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
        width={55}
        border={true}
        borderStyle="rounded"
        borderColor={colors.dimGray}
        paddingLeft={1}
        paddingRight={1}
      >
        <box flexDirection="row">
          <text {...commandPaletteTitleStyle}>Export</text>
          <box flexGrow={1} />
          <text {...commandPaletteShortcutStyle}>esc</text>
        </box>
        <box height={1} />
        <text {...keyStyle}>Filename</text>
        <text {...keyDescStyle}>{state.exportFilename}</text>
        <box height={1} />
        <text {...keyStyle}>Include thinking</text>
        <text {...keyDescStyle}>{state.exportThinking ? 'Yes' : 'No'}</text>
        <box height={1} />
        <text {...keyStyle}>Tool details</text>
        <text {...keyDescStyle}>{state.exportToolDetails ? 'Yes' : 'No'}</text>
        <box height={1} />
        {!hasConversation ? (
          <text {...messageInfoStyle}>
            No conversation to export. Open a conversation first.
          </text>
        ) : (
          <text {...messageInfoStyle}>
            Enter to export to {state.exportFilename} (current directory)
          </text>
        )}
      </box>
    </box>
  );
}

export async function writeConversationToFile(
  state: AppState,
): Promise<{ ok: boolean; path?: string; error?: string }> {
  const conv = getCurrentConversation(state);
  if (!conv || conv.messages.length === 0) {
    return { ok: false, error: 'No conversation to export' };
  }
  const text = formatConversationTranscript(conv, {
    thinking: state.exportThinking,
    toolDetails: state.exportToolDetails,
  });
  const filePath = join(process.cwd(), state.exportFilename);
  try {
    await writeFile(filePath, text, 'utf8');
    return { ok: true, path: filePath };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
