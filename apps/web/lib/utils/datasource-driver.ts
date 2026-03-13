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
