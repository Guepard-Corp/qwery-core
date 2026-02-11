import type { Datasource } from '@qwery/domain/entities';
import { IDatasourceRepository } from '@qwery/domain/repositories';
import { getDriverInstance } from '@qwery/extensions-loader';
import {
  DatasourceExtension,
  ExtensionsRegistry,
  type DriverExtension,
} from '@qwery/extensions-sdk';

import { PlaygroundFactory } from './factory/playground-factory';
import { generateRandomName } from './utils/names';

import { PLAYGROUNDS } from './constants';

export { PLAYGROUNDS };

export class PlaygroundBuilder {
  constructor(private readonly datasourceRepository: IDatasourceRepository) {}

  async build(id: string, projectId: string): Promise<Datasource> {
    const selectedPlayground = PLAYGROUNDS.find(
      (playground) => playground.id === id,
    );
    if (!selectedPlayground) {
      throw new Error(`Playground with id ${id} not found`);
    }

    // Instantiate the playground database
    const playgroundDatabase = PlaygroundFactory.create(
      selectedPlayground.id,
      projectId,
    );
    const connectionConfig = playgroundDatabase.getConnectionConfig(projectId);

    const userId = 'system';

    // Generate unique name for each datasource instance
    const uniqueName = generateRandomName();

    const datasource: Partial<Datasource> = {
      ...selectedPlayground.datasource,
      name: uniqueName,
      projectId,
      config: {
        ...connectionConfig,
        driverId: selectedPlayground.datasource.datasource_driver,
      },
      createdBy: userId,
    };

    const createdDatasource = await this.datasourceRepository.create(
      datasource as Datasource,
    );

    const datasourceProvider =
      selectedPlayground.datasource.datasource_provider;

    const dsMeta =
      ExtensionsRegistry.get<DatasourceExtension>(datasourceProvider);
    if (!dsMeta?.drivers?.length) {
      throw new Error(
        `Extension not found for datasource ${datasourceProvider}`,
      );
    }
    const driverMeta = dsMeta.drivers[0]!;
    const driverInstance = await getDriverInstance(
      driverMeta as DriverExtension,
      { config: datasource.config ?? {} },
    );

    await playgroundDatabase.seed(driverInstance);
    if (driverInstance.close) {
      await driverInstance.close();
    }
    return createdDatasource;
  }
}
