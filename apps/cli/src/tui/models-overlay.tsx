import {
  type ConfigStore,
  getProvider,
  PROVIDERS,
  type ProviderField,
  type ProviderId,
  type ProviderSpec,
} from '@qwery/domain';
import { Box, Text, useInput } from 'ink';
import { useEffect, useMemo, useState } from 'react';
import { useServices } from '../services';

interface ModelsOverlayProps {
  onClose: () => void;
  onSaved: (providerId: ProviderId) => void;
}

interface SelectState {
  status: 'loading' | 'ready' | 'error';
  choices: string[];
  cursor: number;
  visibleStart: number;
  error?: string;
}

interface EditMode {
  kind: 'edit';
  provider: ProviderSpec;
  values: Record<string, string>;
  fieldIndex: number;
  buffer: string;
  select: SelectState | null;
}

type Mode = { kind: 'list' } | EditMode;

const VISIBLE_CHOICES = 8;

export function ModelsOverlay({ onClose, onSaved }: ModelsOverlayProps) {
  const { configStore, logger } = useServices();
  const config = useMemo(() => configStore.read(), [configStore]);
  const [mode, setMode] = useState<Mode>({ kind: 'list' });
  const [cursor, setCursor] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: fires on edit-mode entry; reads a mode snapshot intentionally
  useEffect(() => {
    if (mode.kind !== 'edit') return;
    const field = mode.provider.fields[mode.fieldIndex]!;
    if (field.type !== 'select' || !field.loadChoices) return;
    if (mode.select !== null) return;

    const myFieldIndex = mode.fieldIndex;
    const valuesSnapshot = mode.values;
    const preferred = valuesSnapshot[field.key];

    setMode((m) =>
      m.kind === 'edit' && m.fieldIndex === myFieldIndex && m.select === null
        ? { ...m, select: { status: 'loading', choices: [], cursor: 0, visibleStart: 0 } }
        : m,
    );

    field.loadChoices(valuesSnapshot).then(
      (choices) => {
        setMode((m) => {
          if (m.kind !== 'edit' || m.fieldIndex !== myFieldIndex) return m;
          if (m.select?.status !== 'loading') return m;
          const idx = preferred ? Math.max(0, choices.indexOf(preferred)) : 0;
          return {
            ...m,
            select: {
              status: 'ready',
              choices,
              cursor: idx,
              visibleStart: Math.max(0, idx - Math.floor(VISIBLE_CHOICES / 2)),
            },
          };
        });
      },
      (err) => {
        logger.error('models.loadChoices.error', {
          field: field.key,
          message: err instanceof Error ? err.message : String(err),
        });
        setMode((m) => {
          if (m.kind !== 'edit' || m.fieldIndex !== myFieldIndex) return m;
          if (m.select?.status !== 'loading') return m;
          return {
            ...m,
            select: {
              status: 'error',
              choices: [],
              cursor: 0,
              visibleStart: 0,
              error: err instanceof Error ? err.message : String(err),
            },
          };
        });
      },
    );
  }, [mode]);

  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }

    if (mode.kind === 'list') {
      if (key.upArrow) setCursor((c) => Math.max(0, c - 1));
      else if (key.downArrow) setCursor((c) => Math.min(PROVIDERS.length - 1, c + 1));
      else if (key.return) startEdit(PROVIDERS[cursor]!);
      return;
    }

    const m = mode;
    const field = m.provider.fields[m.fieldIndex]!;

    if (field.type === 'select') {
      const s = m.select;
      if (!s || s.status !== 'ready') return;
      if (key.upArrow) {
        const nextCursor = Math.max(0, s.cursor - 1);
        setMode({
          ...m,
          select: { ...s, cursor: nextCursor, visibleStart: clampVisible(s.visibleStart, nextCursor) },
        });
      } else if (key.downArrow) {
        const nextCursor = Math.min(s.choices.length - 1, s.cursor + 1);
        setMode({
          ...m,
          select: { ...s, cursor: nextCursor, visibleStart: clampVisible(s.visibleStart, nextCursor) },
        });
      } else if (key.return) {
        const value = s.choices[s.cursor]!;
        advance(m, field, value);
      }
      return;
    }

    // text / secret
    if (key.return) {
      const trimmed = m.buffer.trim();
      if (field.required && trimmed.length === 0) return;
      advance(m, field, trimmed);
      return;
    }
    if (key.backspace || key.delete) {
      setMode({ ...m, buffer: m.buffer.slice(0, -1) });
      return;
    }
    if (input && !key.ctrl && !key.meta) {
      setMode({ ...m, buffer: m.buffer + input });
    }
  });

  function startEdit(provider: ProviderSpec): void {
    const existing = config.providers[provider.id]?.values ?? {};
    const initial: Record<string, string> = {};
    for (const f of provider.fields) {
      initial[f.key] = existing[f.key] ?? f.default ?? '';
    }
    const firstField = provider.fields[0]!;
    setMode({
      kind: 'edit',
      provider,
      values: initial,
      fieldIndex: 0,
      buffer:
        firstField.type === 'text' || firstField.type === 'secret' ? (initial[firstField.key] ?? '') : '',
      select: null,
    });
  }

  function advance(m: EditMode, field: ProviderField, value: string): void {
    const nextValues = { ...m.values, [field.key]: value };
    const nextIndex = m.fieldIndex + 1;
    if (nextIndex >= m.provider.fields.length) {
      try {
        configStore.setProviderConfig({ id: m.provider.id, values: nextValues }, true);
        logger.info('models.saved', { providerId: m.provider.id });
        onSaved(m.provider.id);
      } catch (err) {
        logger.error('models.save.error', { message: err instanceof Error ? err.message : String(err) });
      }
      return;
    }
    const nextField = m.provider.fields[nextIndex]!;
    setMode({
      ...m,
      values: nextValues,
      fieldIndex: nextIndex,
      buffer:
        nextField.type === 'text' || nextField.type === 'secret' ? (nextValues[nextField.key] ?? '') : '',
      select: null,
    });
  }

  function clampVisible(visibleStart: number, cursor: number): number {
    if (cursor < visibleStart) return cursor;
    if (cursor >= visibleStart + VISIBLE_CHOICES) return cursor - VISIBLE_CHOICES + 1;
    return visibleStart;
  }

  if (mode.kind === 'list') {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} paddingY={1}>
        <Box justifyContent="space-between">
          <Text bold>Connect a provider</Text>
          <Text dimColor>esc</Text>
        </Box>
        <Box marginY={1}>
          <Text dimColor>↑/↓ navigate · enter select</Text>
        </Box>
        {PROVIDERS.map((p, i) => {
          const connected = !!config.providers[p.id];
          const active = config.activeProvider === p.id;
          const selected = i === cursor;
          return (
            <Box key={p.id} flexDirection="column" marginBottom={selected ? 1 : 0}>
              <Box>
                <Text color={selected ? 'cyan' : undefined} bold={selected} inverse={selected}>
                  {' '}
                  {connected ? '●' : '○'} {p.label}
                  {active ? '  (active)' : ''}{' '}
                </Text>
                <Text dimColor> {p.kind}</Text>
              </Box>
              {selected && (
                <Box paddingLeft={3}>
                  <Text dimColor>{p.description}</Text>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    );
  }

  const field = mode.provider.fields[mode.fieldIndex]!;
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} paddingY={1}>
      <Box justifyContent="space-between">
        <Text bold>
          {mode.provider.label} — {field.label}
          {field.required ? '' : ' (optional)'}
        </Text>
        <Text dimColor>esc cancel</Text>
      </Box>
      <Box marginY={1}>
        <Text dimColor>
          Step {mode.fieldIndex + 1} / {mode.provider.fields.length} ·{' '}
          {field.type === 'select' ? '↑/↓ + enter to pick' : 'enter to confirm'}
        </Text>
      </Box>

      {field.type === 'select' ? (
        <SelectField state={mode.select} />
      ) : (
        <TextField buffer={mode.buffer} field={field} />
      )}

      {field.help && (
        <Box marginTop={1}>
          <Text dimColor>{field.help}</Text>
        </Box>
      )}
      {field.placeholder && field.type !== 'select' && mode.buffer.length === 0 && (
        <Box marginTop={1}>
          <Text dimColor>e.g. {field.placeholder}</Text>
        </Box>
      )}
    </Box>
  );
}

function TextField({ buffer, field }: { buffer: string; field: ProviderField }) {
  const display = field.type === 'secret' && buffer.length > 0 ? '•'.repeat(buffer.length) : buffer;
  return (
    <Box>
      <Text color="magenta" bold>
        ›{' '}
      </Text>
      <Text>{display}</Text>
      <Text inverse> </Text>
    </Box>
  );
}

function SelectField({ state }: { state: SelectState | null }) {
  if (!state || state.status === 'loading') {
    return (
      <Box>
        <Text color="yellow">Loading…</Text>
      </Box>
    );
  }
  if (state.status === 'error') {
    return (
      <Box flexDirection="column">
        <Text color="red">Failed to load choices:</Text>
        <Text dimColor>{state.error}</Text>
        <Box marginTop={1}>
          <Text dimColor>Press esc to cancel and fix the previous step.</Text>
        </Box>
      </Box>
    );
  }
  const { choices, cursor, visibleStart } = state;
  const visible = choices.slice(visibleStart, visibleStart + VISIBLE_CHOICES);
  return (
    <Box flexDirection="column">
      {visibleStart > 0 && <Text dimColor> ↑ {visibleStart} more</Text>}
      {visible.map((choice, i) => {
        const idx = visibleStart + i;
        const selected = idx === cursor;
        return (
          <Text key={choice} color={selected ? 'cyan' : undefined} bold={selected} inverse={selected}>
            {' '}
            {choice}{' '}
          </Text>
        );
      })}
      {visibleStart + VISIBLE_CHOICES < choices.length && (
        <Text dimColor> ↓ {choices.length - visibleStart - VISIBLE_CHOICES} more</Text>
      )}
      <Box marginTop={1}>
        <Text dimColor>
          {cursor + 1} / {choices.length}
        </Text>
      </Box>
    </Box>
  );
}

const MODEL_ROUTING_PREFIX = /^(?:us|eu|apac|global|ap|ca|sa|me|af)\./i;
const MODEL_VENDOR_PREFIX = /^(?:anthropic|amazon|meta|mistral|cohere|ai21|deepseek|stability)\./i;

/**
 * Turns a raw model id into a short, readable name for the status bar.
 * Unwraps Bedrock ARNs/inference-profiles, drops cross-region routing and vendor
 * prefixes, and hard-caps the length so the bar never wraps. Pure display — the
 * raw id is still used for catalog/cost lookups.
 */
export function formatModelName(modelId: string, maxLen = 32): string {
  let s = modelId.trim();
  if (!s) return s;
  if (s.startsWith('arn:')) {
    const slash = s.lastIndexOf('/');
    if (slash !== -1) s = s.slice(slash + 1);
  }
  s = s.replace(MODEL_ROUTING_PREFIX, '').replace(MODEL_VENDOR_PREFIX, '');
  if (s.length > maxLen) s = `${s.slice(0, maxLen - 1)}…`;
  return s;
}

export function activeProviderLabel(configStore: ConfigStore): string | null {
  const cfg = configStore.read();
  if (!cfg.activeProvider) return null;
  const spec = getProvider(cfg.activeProvider);
  const conf = cfg.providers[cfg.activeProvider];
  const model = conf?.values.model ?? conf?.values.deployment ?? '';
  return model ? `${spec.label} · ${formatModelName(model)}` : spec.label;
}
