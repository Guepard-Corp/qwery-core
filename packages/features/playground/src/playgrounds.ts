import type { Datasource, Playground } from '@qwery/domain/entities';
import { DatasourceKind } from '@qwery/domain/entities';
import { IDatasourceRepository } from '@qwery/domain/repositories';
import { getExtension } from '@qwery/extensions-loader';

import { PlaygroundFactory } from './factory/playground-factory';
import { generateRandomName } from './utils/names';

export const PLAYGROUNDS: Playground[] = [
  {
    id: 'pglite',
    logo: '/images/datasources/postgresql_icon_big.png',
    name: 'Embedded PostgreSQL',
    description: 'Test PostgreSQL queries in your browser',
    datasource: {
      name: generateRandomName(),
      description:
        'PostgreSQL is a powerful, open source object-relational database system.',
      datasource_provider: 'pglite',
      datasource_driver: 'pglite.default',
      datasource_kind: DatasourceKind.EMBEDDED,
      config: {
        driverId: 'pglite.default',
      },
    },
  },
];

export class PlaygroundBuilder {
  constructor(private readonly datasourceRepository: IDatasourceRepository) { }

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

    const now = new Date();
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

    const createdDatasource =
      await this.datasourceRepository.create(datasource as Datasource);

    const datasourceProvider = selectedPlayground.datasource.datasource_provider;
    const datasourceName = selectedPlayground.datasource.name;
    const datasourceConfig = datasource.config || {};

    const extension = await getExtension(datasourceProvider);
    if (!extension) {
      throw new Error(
        `Extension not found for datasource ${datasourceProvider}`,
      );
    }
    const driver = await extension.getDriver(
      datasourceName,
      datasourceConfig,
    );
    if (!driver) {
      throw new Error(
        `Driver not found for datasource ${datasourceProvider}`,
      );
    }

    await playgroundDatabase.seed(driver, datasourceConfig);
    if (driver.close) {
      await driver.close();
    }
    return createdDatasource;
  }
}
