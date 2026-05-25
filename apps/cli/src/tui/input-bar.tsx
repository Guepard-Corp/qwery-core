import { matchCommands, type SlashCommand } from '@qwery/domain';
import { Box, Text, useInput } from 'ink';
import { useMemo } from 'react';
import { useServices } from '../services';

export interface InputState {
  value: string;
  cursor: number;
  historyIndex: number | null;
  suggestionIndex: number;
}

export const EMPTY_INPUT_STATE: InputState = {
  value: '',
  cursor: 0,
  historyIndex: null,
  suggestionIndex: 0,
};

export interface InputBarProps {
  state: InputState;
  onChange: (next: InputState) => void;
  onSubmit: (value: string) => void;
  disabled?: boolean;
  history: string[];
}

export function InputBar({ state, onChange, onSubmit, disabled, history }: InputBarProps) {
  const { value, cursor, historyIndex, suggestionIndex } = state;
  const { logger } = useServices();
  const suggestions: SlashCommand[] = useMemo(() => matchCommands(value), [value]);
  const inSlashMode = suggestions.length > 0;
  // A line starting with `!` is executed as a shell command, not sent to the agent.
  const inShellMode = value.startsWith('!');

  useInput((input, key) => {
    if (disabled) return;

    if (key.return) {
      if (inSlashMode) {
        const chosen = suggestions[suggestionIndex] ?? suggestions[0]!;
        onSubmit(chosen.label);
        onChange(EMPTY_INPUT_STATE);
        return;
      }
      const submitted = value.trim();
      if (submitted.length === 0) return;
      onSubmit(submitted);
      onChange(EMPTY_INPUT_STATE);
      return;
    }

    if (key.upArrow && !key.shift) {
      logger.debug('input.upArrow', {
        inSlashMode,
        historyLength: history.length,
        historyIndex,
        valueLength: value.length,
        disabled,
      });
      if (inSlashMode) {
        onChange({ ...state, suggestionIndex: Math.max(0, suggestionIndex - 1) });
        return;
      }
      if (history.length === 0) return;
      const next = historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1);
      const h = history[next] ?? '';
      onChange({ ...state, value: h, cursor: h.length, historyIndex: next });
      return;
    }

    if (key.downArrow && !key.shift) {
      logger.debug('input.downArrow', {
        inSlashMode,
        historyLength: history.length,
        historyIndex,
      });
      if (inSlashMode) {
        onChange({ ...state, suggestionIndex: Math.min(suggestions.length - 1, suggestionIndex + 1) });
        return;
      }
      if (historyIndex === null) return;
      const next = historyIndex + 1;
      if (next >= history.length) {
        onChange({ ...state, value: '', cursor: 0, historyIndex: null });
      } else {
        const h = history[next] ?? '';
        onChange({ ...state, value: h, cursor: h.length, historyIndex: next });
      }
      return;
    }

    if (key.leftArrow) {
      onChange({ ...state, cursor: Math.max(0, cursor - 1) });
      return;
    }
    if (key.rightArrow) {
      onChange({ ...state, cursor: Math.min(value.length, cursor + 1) });
      return;
    }

    if (key.backspace || key.delete) {
      if (cursor === 0) return;
      onChange({
        ...state,
        value: value.slice(0, cursor - 1) + value.slice(cursor),
        cursor: cursor - 1,
        suggestionIndex: 0,
      });
      return;
    }

    if (input && !key.ctrl && !key.meta) {
      onChange({
        ...state,
        value: value.slice(0, cursor) + input + value.slice(cursor),
        cursor: cursor + input.length,
        suggestionIndex: 0,
      });
    }
  });

  const clampedSuggestionIndex = Math.min(suggestionIndex, Math.max(0, suggestions.length - 1));
  const before = value.slice(0, cursor);
  const at = value[cursor] ?? ' ';
  const after = value.slice(cursor + 1);

  return (
    <Box flexDirection="column">
      {inSlashMode && (
        <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
          <Text dimColor>↑/↓ navigate · enter to run</Text>
          {suggestions.map((c, i) => {
            const selected = i === clampedSuggestionIndex;
            return (
              <Box key={c.name}>
                <Text color={selected ? 'cyan' : undefined} bold={selected} inverse={selected}>
                  {' '}
                  {c.label.padEnd(10)}{' '}
                </Text>
                <Text dimColor> {c.description}</Text>
              </Box>
            );
          })}
        </Box>
      )}
      <Box borderStyle="round" borderColor={disabled ? 'gray' : inShellMode ? 'red' : 'magenta'} paddingX={1}>
        <Text color={disabled ? 'gray' : inShellMode ? 'red' : 'magenta'} bold>
          ›{' '}
        </Text>
        <Text>{before}</Text>
        <Text inverse>{at}</Text>
        <Text>{after}</Text>
      </Box>
    </Box>
  );
}
