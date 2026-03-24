import type { Datasource } from '@qwery/domain/entities';
import type {
  DatasourceExtension,
  DriverExtension,
} from '@qwery/extensions-sdk';

type DriverSelectionInput = {
  datasource_driver?: string;
  config?: Record<string, unknown>;
};

export function resolveDatasourceDriver(
  extension: DatasourceExtension,
  datasource: DriverSelectionInput | Datasource,
): DriverExtension | undefined {
  const persistedDriverId = datasource.datasource_driver;
  const configDriverId = (
    datasource.config as { driverId?: string } | undefined
  )?.driverId;

  return (
    extension.drivers.find((driver) => driver.id === persistedDriverId) ??
    extension.drivers.find((driver) => driver.id === configDriverId) ??
    extension.drivers[0]
  );
}

/**
 * Like resolveDatasourceDriver but throws a descriptive Error when no driver
 * can be resolved (empty drivers list or unknown id). Use this at all
 * submission/mutation boundaries so failures surface immediately instead of
 * producing a datasource with an empty driver_id.
 */
export function resolveDriverOrThrow(
  extension: DatasourceExtension,
  datasource: DriverSelectionInput | Datasource,
): DriverExtension {
  const driver = resolveDatasourceDriver(extension, datasource);
  if (!driver) {
    const available = extension.drivers.map((d) => d.id).join(', ') || 'none';
    throw new Error(
      `No driver resolved for provider "${extension.id}". Available: [${available}]`,
    );
  }
  return driver;
}
