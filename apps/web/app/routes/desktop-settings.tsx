'use client';

import { useEffect, useState } from 'react';

import { pageTitle } from '~/lib/page-title';

export const meta = () => [{ title: pageTitle('Desktop settings') }];

import { Button } from '@qwery/ui/button';
import { Input } from '@qwery/ui/input';
import { Label } from '@qwery/ui/label';
import { Page, PageBody, PageHeader, PageTitle } from '@qwery/ui/page';
import { Separator } from '@qwery/ui/separator';
import { Switch } from '@qwery/ui/switch';
import { toast } from 'sonner';
import { isDesktopApp } from '@qwery/shared/desktop';

type KeyConfig = {
  id: string;
  label: string;
  type?: 'password' | 'text';
};

/** LLM keys stored in OS keyring (secrets). Add new providers here and add same env var names to MANAGED_KEYS in apps/desktop/src-tauri/src/lib.rs */
const KEY_GROUPS: { title: string; keys: KeyConfig[] }[] = [
  {
    title: 'Azure OpenAI',
    keys: [
      { id: 'AZURE_API_KEY', label: 'API Key', type: 'password' },
      { id: 'AZURE_RESOURCE_NAME', label: 'Resource Name' },
      { id: 'AZURE_OPENAI_DEPLOYMENT', label: 'Deployment' },
      { id: 'AZURE_API_VERSION', label: 'API Version' },
      { id: 'AZURE_OPENAI_BASE_URL', label: 'Base URL' },
    ],
  },
  {
    title: 'Anthropic',
    keys: [
      { id: 'ANTHROPIC_API_KEY', label: 'API Key', type: 'password' },
      { id: 'ANTHROPIC_BASE_URL', label: 'Base URL' },
    ],
  },
  {
    title: 'OpenAI Compatible',
    keys: [{ id: 'OPENAI_API_KEY', label: 'API Key', type: 'password' }],
  },
  {
    title: 'Defaults',
    keys: [
      { id: 'AGENT_PROVIDER', label: 'Provider' },
      { id: 'DEFAULT_MODEL', label: 'Default Model' },
    ],
  },
];

const FEATURE_FLAG_KEYS: { id: string; label: string }[] = [
  { id: 'USE_SCHEMA_EMBEDDING', label: 'Use schema embedding' },
  { id: 'USE_RETRIEVAL', label: 'Use retrieval' },
  { id: 'USE_OPTIMIZED_PROMPT', label: 'Use optimized prompt' },
];

const TELEMETRY_KEYS: { id: string; label: string; type: 'toggle' | 'text' }[] =
  [
    {
      id: 'QWERY_TELEMETRY_ENABLED',
      label: 'Telemetry enabled',
      type: 'toggle',
    },
    { id: 'OTEL_EXPORTER_OTLP_ENDPOINT', label: 'OTLP endpoint', type: 'text' },
    {
      id: 'QWERY_EXPORT_APP_TELEMETRY',
      label: 'Export app telemetry',
      type: 'toggle',
    },
    { id: 'QWERY_EXPORT_METRICS', label: 'Export metrics', type: 'toggle' },
    { id: 'QWERY_TELEMETRY_DEBUG', label: 'Telemetry debug', type: 'toggle' },
  ];

const CONFIG_KEYS_ORDER = [
  ...FEATURE_FLAG_KEYS.map((k) => k.id),
  ...TELEMETRY_KEYS.map((k) => k.id),
];

type KeyValues = Record<string, string>;
type ConfigValues = Record<string, string>;

export default function DesktopSettingsRoute() {
  const [values, setValues] = useState<KeyValues>({});
  const [config, setConfig] = useState<ConfigValues>({});
  const [configuredKeys, setConfiguredKeys] = useState<Record<string, boolean>>(
    {},
  );
  const [keyringStatus, setKeyringStatus] = useState<Record<string, string>>(
    {},
  );
  const [keysToDelete, setKeysToDelete] = useState<Record<string, boolean>>({});
  const [initialValues, setInitialValues] = useState<KeyValues>({});
  const [initialConfig, setInitialConfig] = useState<ConfigValues>({});
  const [initialConfiguredKeys, setInitialConfiguredKeys] = useState<
    Record<string, boolean>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isDesktopApp()) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function load() {
      try {
        const core = await import('@tauri-apps/api/core');
        const next: KeyValues = {};
        const configuredNext: Record<string, boolean> = {};
        for (const group of KEY_GROUPS) {
          for (const key of group.keys) {
            try {
              const existing = (await core.invoke<string | null>(
                'get_api_key',
                {
                  key: key.id,
                },
              )) as string | null;
              if (existing) {
                configuredNext[key.id] = true;
                if (key.type !== 'password') {
                  next[key.id] = existing;
                }
              }
            } catch {
              // ignore per-key errors
            }
          }
        }
        const configResult = await core.invoke('get_app_config');
        const configNext: ConfigValues = {};
        if (configResult && typeof configResult === 'object') {
          for (const k of CONFIG_KEYS_ORDER) {
            if (configResult[k] !== undefined) {
              configNext[k] = configResult[k];
            }
          }
        }
        if (mounted) {
          setValues(next);
          setConfig(configNext);
          setConfiguredKeys(configuredNext);
          setKeysToDelete({});
          setInitialValues(next);
          setInitialConfig(configNext);
          setInitialConfiguredKeys(configuredNext);
        }
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : 'Failed to load settings.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const handleChange = (id: string, value: string) => {
    setValues((prev) => ({ ...prev, [id]: value }));
    setKeysToDelete((prev) => ({ ...prev, [id]: false }));
    setSaved(false);
    setError(null);
  };

  const handleConfigChange = (id: string, value: string) => {
    setConfig((prev) => ({ ...prev, [id]: value }));
    setSaved(false);
    setError(null);
  };

  const markKeyForDeletion = (id: string) => {
    setValues((prev) => ({ ...prev, [id]: '' }));
    setKeysToDelete((prev) => ({ ...prev, [id]: true }));
    setConfiguredKeys((prev) => ({ ...prev, [id]: false }));
    setSaved(false);
    setError(null);
  };

  const didChangeRequireRestart = () => {
    for (const group of KEY_GROUPS) {
      for (const key of group.keys) {
        const id = key.id;
        if (keysToDelete[id]) return true;
        const nextValue = values[id] ?? '';
        if (key.type === 'password') {
          if (nextValue) return true;
          continue;
        }
        const prevValue = initialValues[id] ?? '';
        if (nextValue !== prevValue) return true;
      }
    }
    for (const k of CONFIG_KEYS_ORDER) {
      const prevValue = initialConfig[k] ?? '';
      const nextValue = config[k] ?? '';
      if (nextValue !== prevValue) return true;
    }
    return false;
  };

  const handleSave = async () => {
    if (!isDesktopApp()) return;

    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const core = await import('@tauri-apps/api/core');

      for (const group of KEY_GROUPS) {
        for (const key of group.keys) {
          const id = key.id;
          if (keysToDelete[id]) {
            await core.invoke('delete_api_key', { key: id });
            continue;
          }

          const value = values[id] ?? '';
          if (key.type === 'password') {
            if (!value) {
              continue;
            }
            await core.invoke('save_api_key', { key: id, value });
            continue;
          }

          if (!value && initialConfiguredKeys[id]) {
            await core.invoke('delete_api_key', { key: id });
          } else if (value) {
            await core.invoke('save_api_key', { key: id, value });
          }
        }
      }

      const configToSave: ConfigValues = {};
      for (const k of CONFIG_KEYS_ORDER) {
        if (config[k] !== undefined) {
          configToSave[k] = config[k];
        }
      }
      await core.invoke('set_app_config', { config: configToSave });

      setSaved(true);
      if (didChangeRequireRestart()) {
        toast.info('Restart required', {
          description:
            'Some changes only apply after restarting the desktop app.',
          duration: 8000,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page>
      <PageHeader>
        <PageTitle>Desktop settings</PageTitle>
      </PageHeader>
      <PageBody className="h-full min-h-0 overflow-auto">
        <div className="max-w-3xl space-y-6">
          {!isDesktopApp() ? (
            <p className="text-muted-foreground text-sm">
              This page is only available in the desktop app.
            </p>
          ) : null}

          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : isDesktopApp() ? (
            <>
              <div className="space-y-1">
                <h2 className="text-sm font-medium">LLM / Models</h2>
                <Separator />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const core = await import('@tauri-apps/api/core');
                    const status = await core.invoke<Record<string, string>>(
                      'debug_keyring_status',
                    );
                    setKeyringStatus(status ?? {});
                    toast.message('Keyring status refreshed');
                  }}
                >
                  Refresh keyring status
                </Button>
                {Object.keys(keyringStatus).length ? (
                  <span className="text-muted-foreground text-xs">
                    {
                      Object.entries(keyringStatus).filter(
                        ([, v]) => v === 'set',
                      ).length
                    }{' '}
                    set / {Object.keys(keyringStatus).length} tracked
                  </span>
                ) : null}
              </div>
              {Object.keys(keyringStatus).length ? (
                <div className="rounded-md border p-3 text-xs">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {Object.entries(keyringStatus).map(([k, v]) => (
                      <div
                        key={k}
                        className="flex items-center justify-between"
                      >
                        <span className="font-mono">{k}</span>
                        <span className="text-muted-foreground">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {KEY_GROUPS.map((group) => (
                <div key={group.title} className="space-y-4">
                  <h3 className="text-muted-foreground text-xs font-medium">
                    {group.title}
                  </h3>
                  <div className="space-y-3">
                    {group.keys.map((key) => (
                      <div key={key.id} className="space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <Label htmlFor={key.id}>{key.label}</Label>
                          {configuredKeys[key.id] ? (
                            <span className="text-muted-foreground text-xs">
                              Configured
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            id={key.id}
                            type={key.type ?? 'text'}
                            value={values[key.id] ?? ''}
                            onChange={(event) =>
                              handleChange(key.id, event.target.value)
                            }
                            placeholder={
                              key.type === 'password' && configuredKeys[key.id]
                                ? 'Configured (enter new value to replace)'
                                : undefined
                            }
                            autoComplete="off"
                          />
                          {key.type === 'password' && configuredKeys[key.id] ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => markKeyForDeletion(key.id)}
                            >
                              Clear
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="space-y-1">
                <h2 className="text-sm font-medium">Feature flags</h2>
                <Separator />
              </div>
              <div className="space-y-3">
                {FEATURE_FLAG_KEYS.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between gap-4"
                  >
                    <Label htmlFor={key.id}>{key.label}</Label>
                    <Switch
                      id={key.id}
                      checked={config[key.id] === 'true'}
                      onCheckedChange={(checked) =>
                        handleConfigChange(key.id, checked ? 'true' : 'false')
                      }
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-1">
                <h2 className="text-sm font-medium">Telemetry</h2>
                <Separator />
              </div>
              <div className="space-y-3">
                {TELEMETRY_KEYS.map((key) =>
                  key.type === 'text' ? (
                    <div key={key.id} className="space-y-1">
                      <Label htmlFor={key.id}>{key.label}</Label>
                      <Input
                        id={key.id}
                        value={config[key.id] ?? ''}
                        onChange={(e) =>
                          handleConfigChange(key.id, e.target.value)
                        }
                        placeholder="http://localhost:4317"
                      />
                    </div>
                  ) : (
                    <div
                      key={key.id}
                      className="flex items-center justify-between gap-4"
                    >
                      <Label htmlFor={key.id}>{key.label}</Label>
                      <Switch
                        id={key.id}
                        checked={config[key.id] === 'true'}
                        onCheckedChange={(checked) =>
                          handleConfigChange(key.id, checked ? 'true' : 'false')
                        }
                      />
                    </div>
                  ),
                )}
              </div>

              {error && (
                <p
                  className="text-destructive text-sm"
                  data-test="settings-error"
                >
                  {error}
                </p>
              )}
              {saved && !error && (
                <p
                  className="text-muted-foreground text-sm"
                  data-test="settings-saved"
                >
                  Saved.
                </p>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  data-test="settings-save"
                >
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </PageBody>
    </Page>
  );
}
