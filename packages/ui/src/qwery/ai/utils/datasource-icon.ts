function normalizeDatasourceKey(value: string): string {
  return value.trim().toLowerCase();
}

function buildDatasourceKeyCandidates(value: string): string[] {
  const normalized = normalizeDatasourceKey(value);
  const candidates = new Set<string>([normalized]);

  // Support provider variants: foo-bar <-> foo_bar <-> foo.bar
  candidates.add(normalized.replace(/_/g, '-'));
  candidates.add(normalized.replace(/-/g, '_'));
  candidates.add(normalized.replace(/\./g, '-'));
  candidates.add(normalized.replace(/\./g, '_'));

  // Intentionally do not collapse `foo-bar` / `foo_bar` to `foo`.
  // Sibling extensions should not override each other's icons.

  return [...candidates];
}

export function getDatasourceIcon(
  pluginLogoMap: Map<string, string> | undefined,
  providerOrId: string | undefined,
): string | undefined {
  if (!pluginLogoMap || !providerOrId) {
    return undefined;
  }

  const candidates = buildDatasourceKeyCandidates(providerOrId);
  for (const key of candidates) {
    const icon = pluginLogoMap.get(key);
    if (icon) {
      return icon;
    }
  }

  return undefined;
}

export function datasourceIconMapKeys(
  extensionId: string,
  driverIds: string[],
) {
  const keys = new Set<string>();
  const add = (value: string) => {
    for (const candidate of buildDatasourceKeyCandidates(value)) {
      keys.add(candidate);
    }
  };

  add(extensionId);
  for (const driverId of driverIds) {
    add(driverId);
  }

  return [...keys];
}
