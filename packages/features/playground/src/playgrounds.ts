import type { Datasource, Playground } from '@qwery/domain/entities';
import { DatasourceKind } from '@qwery/domain/entities';
import { DatasourceRepositoryPort } from '@qwery/domain/repositories';
import { getExtension } from '@qwery/extensions-sdk';

import { PlaygroundFactory } from './factory/playground-factory';
import { generateRandomName } from './utils/names';

export const PLAYGROUNDS = [
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
      datasource_kind: DatasourceKind.EMBEDDED,
      config: {},
    },
  },
] as Playground[];

export class PlaygroundBuilder {
  constructor(
    private readonly datasourceRepository: DatasourceRepositoryPort,
  ) {}

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
    const connectionConfig = playgroundDatabase.getConnectionConfig();

    const datasource: Datasource = {
      ...selectedPlayground.datasource,
      projectId,
      config: connectionConfig,
    };

    const createdDatasource =
      await this.datasourceRepository.create(datasource);

    const extension = await getExtension(datasource.datasource_provider);
    if (!extension) {
      throw new Error(
        `Extension not found for datasource ${datasource.datasource_provider}`,
      );
    }
    const driver = await extension.getDriver(
      datasource.name,
      datasource.config,
    );
    if (!driver) {
      throw new Error(
        `Driver not found for datasource ${datasource.datasource_provider}`,
      );
    }
    await driver.connect();

    await playgroundDatabase.seed(driver);
    await driver.close();
    return createdDatasource;
  }
}
