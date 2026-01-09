import type { Workspace } from '@qwery/domain/entities';
import { TelemetryManager } from '@qwery/telemetry/otel';

import {
  CreateProjectService,
  DeleteProjectService,
  GetDatasourcesByProjectIdService,
  GetNotebooksByProjectIdService,
  GetOrganizationService,
  GetOrganizationsService,
  GetProjectsByOrganizationIdService,
  InitWorkspaceService,
} from '@qwery/domain/services';
import {
  ConversationRepository,
  DatasourceRepository,
  MessageRepository,
  NotebookRepository,
  OrganizationRepository,
  ProjectRepository,
  UserRepository,
  UsageRepository,
} from '@qwery/repository-in-memory';

import { FileStateStore } from '../infrastructure/persistence/file-state-store';
import { CliWorkspaceModeService } from '../infrastructure/workspace/cli-workspace-mode.service';
import type { CliState } from '../state/cli-state';
import { createInitialState, ensureWorkspaceMode } from '../state/cli-state';
import { NotebookRunner } from '../services/notebook-runner';

export class CliContainer {
  private state: CliState = createInitialState();
  public telemetry: TelemetryManager;

  private readonly repositories = {
    user: new UserRepository(),
    organization: new OrganizationRepository(),
    project: new ProjectRepository(),
    datasource: new DatasourceRepository(),
    notebook: new NotebookRepository(),
    conversation: new ConversationRepository(),
    message: new MessageRepository(),
    usage: new UsageRepository(),
  };

  private readonly workspaceModeService = new CliWorkspaceModeService();
  private readonly notebookRunner: NotebookRunner;

  private readonly useCases = {
    initWorkspace: new InitWorkspaceService(
      this.repositories.user,
      this.workspaceModeService,
      this.repositories.organization,
      this.repositories.project,
      this.repositories.notebook,
    ),
    getProjects: new GetProjectsByOrganizationIdService(
      this.repositories.project,
    ),
    createProject: new CreateProjectService(this.repositories.project),
    deleteProject: new DeleteProjectService(this.repositories.project),
    getDatasourcesByProjectId: new GetDatasourcesByProjectIdService(
      this.repositories.datasource,
    ),
    getNotebooksByProjectId: new GetNotebooksByProjectIdService(
      this.repositories.notebook,
    ),
    getOrganizations: new GetOrganizationsService(
      this.repositories.organization,
    ),
    getOrganization: new GetOrganizationService(this.repositories.organization),
  };

  constructor(
    private readonly stateStore: FileStateStore = new FileStateStore(),
  ) {
    // Generate session ID for this CLI run
    const sessionId = `cli-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    this.telemetry = new TelemetryManager('qwery-cli', sessionId);
    this.notebookRunner = new NotebookRunner(this.telemetry);
  }

  public async init(): Promise<void> {
    this.state = await this.stateStore.load();
    await this.seedRepositories();
    // Initialize telemetry after repositories are seeded
    await this.telemetry.init();
  }

  public async persist(): Promise<void> {
    await this.refreshStateFromRepositories();
    await this.stateStore.save(this.state);
  }

  public getUseCases() {
    return this.useCases;
  }

  public getWorkspace(): Workspace | null {
    return this.state.workspace;
  }

  public getRepositories() {
    return this.repositories;
  }

  public getNotebookRunner() {
    return this.notebookRunner;
  }

  public setWorkspace(workspace: Workspace | null): void {
    this.state.workspace = ensureWorkspaceMode(workspace);
  }

  public getState(): CliState {
    return this.state;
  }

  public getStateFilePath(): string {
    return this.stateStore.path;
  }

  private async seedRepositories(): Promise<void> {
    await Promise.all([
      this.seedUsers(),
      this.seedOrganizations(),
      this.seedProjects(),
      this.seedDatasources(),
      this.seedNotebooks(),
    ]);
  }

  private async seedUsers() {
    for (const user of this.state.users) {
      await this.repositories.user.create(user);
    }
  }

  private async seedOrganizations() {
    for (const organization of this.state.organizations) {
      await this.repositories.organization.create(organization);
    }
  }

  private async seedProjects() {
    for (const project of this.state.projects) {
      await this.repositories.project.create(project);
    }
  }

  private async seedDatasources() {
    for (const datasource of this.state.datasources) {
      await this.repositories.datasource.create(datasource);
    }
  }

  private async seedNotebooks() {
    for (const notebook of this.state.notebooks) {
      await this.repositories.notebook.create(notebook);
    }
  }

  private async refreshStateFromRepositories() {
    this.state = {
      ...this.state,
      users: await this.repositories.user.findAll(),
      organizations: await this.repositories.organization.findAll(),
      projects: await this.repositories.project.findAll(),
      datasources: await this.repositories.datasource.findAll(),
      notebooks: await this.repositories.notebook.findAll(),
      workspace: ensureWorkspaceMode(this.state.workspace),
    };
  }
}
