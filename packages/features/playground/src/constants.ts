import { DatasourceKind, type Playground } from '@qwery/domain/entities';
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
