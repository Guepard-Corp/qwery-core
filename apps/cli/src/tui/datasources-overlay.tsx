import { Datasource as DatasourceUseCases, Project as ProjectUseCases } from '@qwery/application';
import type { Datasource, Project } from '@qwery/domain';
import { type DatasourceExtension, ExtensionsRegistry } from '@qwery/extension-sdk';
import { Box, Text, useInput } from 'ink';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AttachState } from '../infra/datasources';
import { useServices } from '../services';

interface DatasourcesOverlayProps {
  onClose: () => void;
  onAttached?: (ds: Datasource) => void;
}

interface FormField {
  key: string;
  label: string;
  description?: string;
  placeholder?: string;
  secret: boolean;
  required: boolean;
  defaultValue?: string;
}

/** A single connection method an extension offers (one per union branch). */
interface Variant {
  label: string;
  fields: FormField[];
}

type Mode =
  | { kind: 'list'; cursor: number }
  | { kind: 'pick-extension'; cursor: number }
  | { kind: 'pick-variant'; extension: DatasourceExtension; variants: Variant[]; cursor: number }
  | { kind: 'confirm-delete'; datasource: Datasource; cursor: number }
  | {
      kind: 'configure';
      extension: DatasourceExtension;
      fields: FormField[];
      values: Record<string, string>;
      fieldIndex: number;
      buffer: string;
      error?: string;
    };

interface ZodFieldLike {
  meta?: () => Record<string, unknown> | undefined;
  isOptional?: () => boolean;
  _def?: { defaultValue?: unknown };
}

interface ZodObjectLike {
  shape: Record<string, ZodFieldLike>;
}

interface ZodUnionLike {
  options?: unknown[];
  _def?: { options?: unknown[] };
}

function resolveDefault(raw: unknown): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  // Zod v3 wrapped defaults in a thunk; Zod v4 stores the value directly.
  const value = typeof raw === 'function' ? (raw as () => unknown)() : raw;
  return value === undefined || value === null ? undefined : String(value);
}

function getObjectShape(schema: unknown): Record<string, ZodFieldLike> | undefined {
  if (schema && typeof schema === 'object' && 'shape' in schema) {
    return (schema as ZodObjectLike).shape;
  }
  return undefined;
}

function getUnionOptions(schema: unknown): unknown[] | undefined {
  if (!schema || typeof schema !== 'object') return undefined;
  const s = schema as ZodUnionLike;
  const options = s.options ?? s._def?.options;
  return Array.isArray(options) ? options : undefined;
}

function getSchemaMeta(schema: unknown): Record<string, unknown> | undefined {
  if (
    schema &&
    typeof schema === 'object' &&
    'meta' in schema &&
    typeof (schema as { meta: unknown }).meta === 'function'
  ) {
    return (schema as { meta: () => Record<string, unknown> | undefined }).meta();
  }
  return undefined;
}

function fieldsFromShape(shape: Record<string, ZodFieldLike>): FormField[] {
  const fields: FormField[] = [];
  for (const [key, fieldSchema] of Object.entries(shape)) {
    const meta = typeof fieldSchema.meta === 'function' ? fieldSchema.meta() : undefined;
    const defaultValue = resolveDefault(fieldSchema._def?.defaultValue);
    const optional = typeof fieldSchema.isOptional === 'function' ? fieldSchema.isOptional() : false;
    fields.push({
      key,
      label: (meta?.label as string) ?? key,
      description: meta?.description as string | undefined,
      placeholder: meta?.placeholder as string | undefined,
      secret: meta?.secret === true,
      required: !optional && defaultValue === undefined,
      defaultValue,
    });
  }
  return fields;
}

/**
 * Derives the connection variants an extension offers. A plain-object schema is a
 * single variant; a `z.union([...])` exposes one variant per branch (e.g. connect
 * by host & credentials vs. by URL), each with its own required fields.
 */
function extractVariants(extension: DatasourceExtension): Variant[] {
  const schema = extension.schema;
  if (!schema || typeof schema !== 'object') return [];

  const directShape = getObjectShape(schema);
  if (directShape) {
    const fields = fieldsFromShape(directShape);
    return fields.length > 0 ? [{ label: 'Configuration', fields }] : [];
  }

  const options = getUnionOptions(schema);
  if (options) {
    const variants: Variant[] = [];
    options.forEach((option, index) => {
      const shape = getObjectShape(option);
      if (!shape) return;
      const fields = fieldsFromShape(shape);
      if (fields.length === 0) return;
      const label = (getSchemaMeta(option)?.label as string) ?? `Option ${index + 1}`;
      variants.push({ label, fields });
    });
    return variants;
  }
  return [];
}

export function DatasourcesOverlay({ onClose, onAttached }: DatasourcesOverlayProps) {
  const { datasourceRepo, projectRepo, currentProject, attachedDatasources, logger, vault } = useServices();
  const [mode, setMode] = useState<Mode>({ kind: 'list', cursor: 0 });
  const [datasources, setDatasources] = useState<Datasource[]>([]);
  const [attachStates, setAttachStates] = useState<AttachState[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  // Datasource ids attached to the current project, and the projects each
  // datasource belongs to (for the badges). Default view shows only the
  // current project's datasources; `t` reveals every datasource.
  const [projectDsIds, setProjectDsIds] = useState<Set<string>>(new Set());
  const [projectsByDs, setProjectsByDs] = useState<Record<string, Project[]>>({});
  const [showAll, setShowAll] = useState(false);

  const refreshProjects = useCallback(
    async (all: Datasource[]) => {
      const ids = await projectRepo.listDatasourceIds(currentProject.id);
      setProjectDsIds(new Set(ids));
      const pairs = await Promise.all(
        all.map(async (d) => [d.id, await projectRepo.findByDatasourceId(d.id)] as const),
      );
      setProjectsByDs(Object.fromEntries(pairs));
    },
    [projectRepo, currentProject],
  );

  useEffect(() => {
    void datasourceRepo.findAll().then((all) => {
      setDatasources(all);
      void refreshProjects(all);
    });
    return attachedDatasources.subscribe(setAttachStates);
  }, [datasourceRepo, attachedDatasources, refreshProjects]);

  const extensions = useMemo(() => ExtensionsRegistry.listDatasources(), []);

  // The datasources shown in the list: the current project's, or all of them.
  const visibleDatasources = useMemo(
    () => (showAll ? datasources : datasources.filter((d) => projectDsIds.has(d.id))),
    [showAll, datasources, projectDsIds],
  );

  function attachStateFor(id: string): AttachState | undefined {
    return attachStates.find((s) => s.datasource.id === id);
  }

  async function toggleProjectAttach(ds: Datasource): Promise<void> {
    if (projectDsIds.has(ds.id)) {
      await ProjectUseCases.detachDatasourceFromProject({ projectRepo }, currentProject.id, ds.id);
      setStatus(`Detached ${ds.name} from ${currentProject.name}`);
    } else {
      await ProjectUseCases.attachDatasourceToProject({ projectRepo }, currentProject.id, ds.id);
      setStatus(`Attached ${ds.name} to ${currentProject.name}`);
    }
    await refreshProjects(datasources);
  }

  async function triggerAttach(ds: Datasource): Promise<void> {
    setStatus(`Attaching ${ds.name}…`);
    const state = await attachedDatasources.attach(ds);
    if (state.status === 'attached') {
      setStatus(`Attached ${ds.name} (${state.tables.length} table${state.tables.length === 1 ? '' : 's'})`);
      onAttached?.(ds);
    } else if (state.status === 'error') {
      setStatus(`Attach failed: ${state.error}`);
    }
  }

  async function triggerDetach(ds: Datasource): Promise<void> {
    setStatus(`Detaching ${ds.name}…`);
    await attachedDatasources.detach(ds);
    setStatus(`Detached ${ds.name}`);
  }

  function enterConfigure(extension: DatasourceExtension, fields: FormField[]): void {
    const values: Record<string, string> = {};
    for (const f of fields) values[f.key] = f.defaultValue ?? '';
    setMode({
      kind: 'configure',
      extension,
      fields,
      values,
      fieldIndex: 0,
      buffer: values[fields[0]!.key] ?? '',
    });
  }

  useInput((input, key) => {
    if (key.escape) {
      if (mode.kind === 'list') onClose();
      else setMode({ kind: 'list', cursor: 0 });
      return;
    }

    if (mode.kind === 'list') {
      const selectedDs = visibleDatasources[mode.cursor];
      if (key.upArrow) setMode({ kind: 'list', cursor: Math.max(0, mode.cursor - 1) });
      else if (key.downArrow)
        setMode({
          kind: 'list',
          cursor: Math.min(Math.max(0, visibleDatasources.length - 1), mode.cursor + 1),
        });
      else if (input === 't') {
        // Toggle between the current project's datasources and all of them.
        setShowAll((v) => !v);
        setMode({ kind: 'list', cursor: 0 });
      } else if (input === 'n') setMode({ kind: 'pick-extension', cursor: 0 });
      else if (input === 'a' && selectedDs) {
        // `a` toggles compute attach: detach an attached datasource, else attach.
        if (attachStateFor(selectedDs.id)?.status === 'attached') void triggerDetach(selectedDs);
        else void triggerAttach(selectedDs);
      } else if (input === 'p' && selectedDs) {
        // `p` toggles membership of the datasource in the current project.
        void toggleProjectAttach(selectedDs);
      } else if (input === 'd' && selectedDs) {
        setMode({ kind: 'confirm-delete', datasource: selectedDs, cursor: mode.cursor });
      }
      return;
    }

    if (mode.kind === 'confirm-delete') {
      // `y` confirms; anything else (including `n`) cancels back to the list.
      const previousCursor = mode.cursor;
      const ds = mode.datasource;
      if (input === 'y' || input === 'Y') {
        void (async () => {
          await attachedDatasources.detach(ds);
          // Remove the datasource's project memberships so no join rows dangle.
          for (const p of projectsByDs[ds.id] ?? []) {
            await ProjectUseCases.detachDatasourceFromProject({ projectRepo }, p.id, ds.id);
          }
          await datasourceRepo.delete(ds.id);
          const next = await datasourceRepo.findAll();
          setDatasources(next);
          await refreshProjects(next);
          setMode({ kind: 'list', cursor: Math.min(previousCursor, Math.max(0, next.length - 1)) });
          setStatus(`Deleted ${ds.name}`);
        })();
      } else if (input === 'n' || input === 'N' || key.return) {
        setMode({ kind: 'list', cursor: previousCursor });
      }
      return;
    }

    if (mode.kind === 'pick-extension') {
      if (key.upArrow) setMode({ ...mode, cursor: Math.max(0, mode.cursor - 1) });
      else if (key.downArrow)
        setMode({ ...mode, cursor: Math.min(Math.max(0, extensions.length - 1), mode.cursor + 1) });
      else if (key.return && extensions[mode.cursor]) {
        const extension = extensions[mode.cursor]!;
        const variants = extractVariants(extension);
        if (variants.length === 0) {
          setStatus(`Extension "${extension.id}" exposes no configurable fields`);
          return;
        }
        if (variants.length === 1) {
          enterConfigure(extension, variants[0]!.fields);
        } else {
          setMode({ kind: 'pick-variant', extension, variants, cursor: 0 });
        }
      }
      return;
    }

    if (mode.kind === 'pick-variant') {
      if (key.upArrow) setMode({ ...mode, cursor: Math.max(0, mode.cursor - 1) });
      else if (key.downArrow)
        setMode({ ...mode, cursor: Math.min(mode.variants.length - 1, mode.cursor + 1) });
      else if (key.return && mode.variants[mode.cursor]) {
        enterConfigure(mode.extension, mode.variants[mode.cursor]!.fields);
      }
      return;
    }

    // configure mode
    const m = mode;
    const field = m.fields[m.fieldIndex]!;

    if (key.return) {
      const trimmed = m.buffer.trim();
      if (field.required && trimmed.length === 0) {
        setMode({ ...m, error: `${field.label} is required` });
        return;
      }
      const nextValues = { ...m.values, [field.key]: trimmed || (m.values[field.key] ?? '') };
      const nextIndex = m.fieldIndex + 1;
      if (nextIndex >= m.fields.length) {
        void submit(m.extension, m.fields, nextValues);
        return;
      }
      const nextField = m.fields[nextIndex]!;
      setMode({
        ...m,
        values: nextValues,
        fieldIndex: nextIndex,
        buffer: nextValues[nextField.key] ?? '',
        error: undefined,
      });
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

  async function submit(
    extension: DatasourceExtension,
    fields: FormField[],
    values: Record<string, string>,
  ): Promise<void> {
    try {
      const config: Record<string, unknown> = {};
      for (const f of fields) {
        const raw = values[f.key] ?? '';
        if (f.secret && raw.length > 0) {
          config[f.key] = await vault.protect(raw, { keyName: `${extension.id}.${f.key}` });
        } else {
          config[f.key] = raw;
        }
      }
      const driverReg = extension.drivers[0];
      if (!driverReg) {
        setStatus(`Extension "${extension.id}" has no drivers`);
        return;
      }
      const ds = await DatasourceUseCases.createDatasource(
        { datasourceRepo },
        {
          name: extension.name,
          description: extension.description ?? '',
          datasource_provider: extension.id,
          datasource_driver: driverReg.id,
          config,
        },
      );
      logger.info('datasource.created', { id: ds.id, driver: driverReg.id });
      // A datasource created from within a project is attached to it by default.
      await ProjectUseCases.attachDatasourceToProject({ projectRepo }, currentProject.id, ds.id);
      const refreshed = await datasourceRepo.findAll();
      setDatasources(refreshed);
      await refreshProjects(refreshed);
      setMode({ kind: 'list', cursor: 0 });
      await triggerAttach(ds);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('datasource.create.error', { message });
      setStatus(`Save failed: ${message}`);
    }
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} paddingY={1}>
      <Box justifyContent="space-between">
        <Text bold>
          {mode.kind === 'list'
            ? 'Datasources'
            : mode.kind === 'pick-extension'
              ? 'Pick an extension'
              : mode.kind === 'pick-variant'
                ? `Connect ${mode.extension.name}`
                : mode.kind === 'confirm-delete'
                  ? `Delete ${mode.datasource.name}?`
                  : `Configure ${mode.extension.name}`}
        </Text>
        <Text dimColor>esc {mode.kind === 'list' ? 'close' : 'back'}</Text>
      </Box>

      {status && (
        <Box marginY={1}>
          <Text color="yellow">{status}</Text>
        </Box>
      )}

      {mode.kind === 'list' && (
        <ListMode
          datasources={visibleDatasources}
          cursor={mode.cursor}
          attachStateFor={attachStateFor}
          projectsByDs={projectsByDs}
          currentProject={currentProject}
          showAll={showAll}
        />
      )}
      {mode.kind === 'pick-extension' && <PickExtensionMode extensions={extensions} cursor={mode.cursor} />}
      {mode.kind === 'pick-variant' && <PickVariantMode mode={mode} />}
      {mode.kind === 'confirm-delete' && <ConfirmDeleteMode datasource={mode.datasource} />}
      {mode.kind === 'configure' && <ConfigureMode mode={mode} />}
    </Box>
  );
}

function ListMode({
  datasources,
  cursor,
  attachStateFor,
  projectsByDs,
  currentProject,
  showAll,
}: {
  datasources: Datasource[];
  cursor: number;
  attachStateFor: (id: string) => AttachState | undefined;
  projectsByDs: Record<string, Project[]>;
  currentProject: Project;
  showAll: boolean;
}) {
  const scopeLabel = showAll ? 'all datasources' : currentProject.name;
  return (
    <Box flexDirection="column">
      <Box marginY={1} flexDirection="column">
        <Text dimColor>↑/↓ navigate · n new · a attach/detach · p project · d delete · esc close</Text>
        <Text dimColor>
          showing {scopeLabel} · t: {showAll ? 'this project only' : 'show all'}
        </Text>
      </Box>
      {datasources.length === 0 ? (
        <Text dimColor>
          {showAll
            ? 'No datasources configured yet. Press `n` to add one.'
            : `No datasources in ${currentProject.name}. Press \`n\` to add one, or \`t\` to see all and \`p\` to attach.`}
        </Text>
      ) : (
        datasources.map((ds, i) => {
          const state = attachStateFor(ds.id);
          const statusLabel =
            state?.status === 'attached'
              ? `attached · ${state.tables.length} table${state.tables.length === 1 ? '' : 's'}`
              : state?.status === 'error'
                ? `error: ${state.error}`
                : 'detached';
          const color = state?.status === 'attached' ? 'green' : state?.status === 'error' ? 'red' : 'gray';
          const selected = i === cursor;
          const projects = projectsByDs[ds.id] ?? [];
          const projectNames = projects.map((p) => p.name).join(', ');
          return (
            <Box key={ds.id} flexDirection="column">
              <Box>
                <Text color={selected ? 'cyan' : undefined} bold={selected} inverse={selected}>
                  {' '}
                  {ds.name}{' '}
                </Text>
                <Text dimColor> {ds.datasource_provider}</Text>
              </Box>
              <Box paddingLeft={1}>
                <Text color={color}>{statusLabel}</Text>
                <Text dimColor> · projects: {projects.length > 0 ? projectNames : 'none'}</Text>
              </Box>
            </Box>
          );
        })
      )}
    </Box>
  );
}

function PickExtensionMode({ extensions, cursor }: { extensions: DatasourceExtension[]; cursor: number }) {
  if (extensions.length === 0) {
    return (
      <Box marginY={1} flexDirection="column">
        <Text color="red">No datasource extensions registered.</Text>
        <Text dimColor>Install one (e.g. `@qwery/extension-csv-local`) and restart.</Text>
      </Box>
    );
  }
  return (
    <Box flexDirection="column">
      <Box marginY={1}>
        <Text dimColor>↑/↓ navigate · enter select · esc back</Text>
      </Box>
      {extensions.map((ext, i) => {
        const selected = i === cursor;
        return (
          <Box key={ext.id} flexDirection="column">
            <Box>
              <Text color={selected ? 'cyan' : undefined} bold={selected} inverse={selected}>
                {' '}
                {ext.icon} {ext.name}{' '}
              </Text>
              <Text dimColor> {ext.id}</Text>
            </Box>
            {selected && ext.description && (
              <Box paddingLeft={3}>
                <Text dimColor>{ext.description}</Text>
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

function PickVariantMode({ mode }: { mode: Extract<Mode, { kind: 'pick-variant' }> }) {
  return (
    <Box flexDirection="column">
      <Box marginY={1}>
        <Text dimColor>↑/↓ navigate · enter select · esc back · choose how to connect</Text>
      </Box>
      {mode.variants.map((variant, i) => {
        const selected = i === mode.cursor;
        return (
          <Box key={variant.label} flexDirection="column">
            <Text color={selected ? 'cyan' : undefined} bold={selected} inverse={selected}>
              {' '}
              {variant.label}{' '}
            </Text>
            {selected && (
              <Box paddingLeft={3}>
                <Text dimColor>{variant.fields.map((f) => f.label).join(', ')}</Text>
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

function ConfirmDeleteMode({ datasource }: { datasource: Datasource }) {
  return (
    <Box flexDirection="column" marginY={1}>
      <Text>
        Delete datasource <Text bold>{datasource.name}</Text>{' '}
        <Text dimColor>({datasource.datasource_provider})</Text>?
      </Text>
      <Box marginTop={1}>
        <Text dimColor>
          This detaches it from the current session and removes its configuration permanently.
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color="red" bold>
          y
        </Text>
        <Text> confirm · </Text>
        <Text bold>n</Text>
        <Text dimColor> / enter / esc cancel</Text>
      </Box>
    </Box>
  );
}

function ConfigureMode({ mode }: { mode: Extract<Mode, { kind: 'configure' }> }) {
  const field = mode.fields[mode.fieldIndex]!;
  const display = field.secret && mode.buffer.length > 0 ? '•'.repeat(mode.buffer.length) : mode.buffer;
  return (
    <Box flexDirection="column">
      <Box marginY={1}>
        <Text dimColor>
          Step {mode.fieldIndex + 1} / {mode.fields.length} · enter to confirm · esc back
        </Text>
      </Box>
      <Box>
        <Text bold>
          {field.label}
          {field.required ? '' : ' (optional)'}:{' '}
        </Text>
      </Box>
      <Box>
        <Text color="magenta" bold>
          ›{' '}
        </Text>
        <Text>{display}</Text>
        <Text inverse> </Text>
      </Box>
      {field.description && (
        <Box marginTop={1}>
          <Text dimColor>{field.description}</Text>
        </Box>
      )}
      {field.placeholder && mode.buffer.length === 0 && (
        <Box marginTop={1}>
          <Text dimColor>e.g. {field.placeholder}</Text>
        </Box>
      )}
      {mode.error && (
        <Box marginTop={1}>
          <Text color="red">{mode.error}</Text>
        </Box>
      )}
    </Box>
  );
}
