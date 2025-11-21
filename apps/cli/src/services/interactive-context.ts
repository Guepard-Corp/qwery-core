import type { Datasource } from '@qwery/domain/entities';
import type { CliContainer } from '../container/cli-container';
import { successBox, errorBox } from '../utils/formatting';

export class InteractiveContext {
  private currentDatasourceId: string | null = null;
  private datasourceName: string | null = null;

  constructor(private readonly container: CliContainer) {}

  public async setDatasource(datasourceId: string): Promise<void> {
    const repositories = this.container.getRepositories();
    const datasource = await repositories.datasource.findById(datasourceId);

    if (!datasource) {
      console.log(
        '\n' +
          errorBox(`Datasource with id "${datasourceId}" not found.`) +
          '\n',
      );
      return;
    }

    this.currentDatasourceId = datasourceId;
    this.datasourceName = datasource.name;
    console.log(
      '\n' +
        successBox(`Using datasource: ${datasource.name}\nProvider: ${datasource.datasource_provider}`) +
        '\n',
    );
  }

  public async getCurrentDatasource(): Promise<Datasource | null> {
    if (!this.currentDatasourceId) {
      return null;
    }

    const repositories = this.container.getRepositories();
    return await repositories.datasource.findById(this.currentDatasourceId);
  }

  public getDatasourceName(): string | null {
    return this.datasourceName;
  }
}

