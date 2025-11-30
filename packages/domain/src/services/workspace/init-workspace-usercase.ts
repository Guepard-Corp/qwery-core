import { v4 as uuidv4 } from 'uuid';

import { Roles } from '../../common/roles';
import { User } from '../../entities';
import {
  IOrganizationRepository,
  IProjectRepository,
  IUserRepository,
  INotebookRepository,
} from '../../repositories';
import {
  InitWorkspaceUseCase,
  UserOutput,
  OrganizationOutput,
  WorkspaceOutput,
  ProjectOutput,
  WorkspaceRuntimeUseCase,
  WorkspaceInput,
} from '../../usecases';
import { WorkspaceModeEnum } from '../../enums';
import {
  CreateOrganizationService,
  CreateProjectService,
  CreateNotebookService,
} from '..';

function createAnonymousUser(): User {
  const now = new Date();
  return {
    id: uuidv4(),
    username: 'anonymous',
    role: Roles.SUPER_ADMIN,
    createdAt: now,
    updatedAt: now,
  };
}

async function createDefaultOrganization(
  userId: string,
  organizationRepository: IOrganizationRepository,
): Promise<OrganizationOutput> {
  const useCase = new CreateOrganizationService(organizationRepository);
  const organization = await useCase.execute({
    name: 'Default Organization',
    is_owner: true,
    createdBy: userId,
  });
  return organization;
}

async function createDefaultProject(
  orgId: string,
  userId: string,
  projectRepository: IProjectRepository,
): Promise<ProjectOutput> {
  const useCase = new CreateProjectService(projectRepository);
  const project = await useCase.execute({
    org_id: orgId,
    name: 'Default Project',
    createdBy: userId,
  });
  return project;
}

export class InitWorkspaceService implements InitWorkspaceUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly workspaceRuntimeUseCase: WorkspaceRuntimeUseCase,
    private readonly organizationRepository?: IOrganizationRepository,
    private readonly projectRepository?: IProjectRepository,
    private readonly notebookRepository?: INotebookRepository,
  ) {}

  public async execute(port: WorkspaceInput): Promise<WorkspaceOutput> {
    let user: User | null = null;
    let isAnonymous = false;
    const mode: WorkspaceModeEnum = Object.values(WorkspaceModeEnum).includes(
      port.mode as WorkspaceModeEnum,
    )
      ? (port.mode as WorkspaceModeEnum)
      : WorkspaceModeEnum.SIMPLE;

    if (port.userId) {
      user = await this.userRepository.findById(port.userId);
    }

    if (!user) {
      user = createAnonymousUser();
      isAnonymous = true;
    }

    const userDto = UserOutput.new(user);

    let organization;
    if (port.organizationId && this.organizationRepository) {
      try {
        organization = await this.organizationRepository.findById(
          port.organizationId,
        );
      } catch (error) {
        console.warn(
          `Organization with id ${port.organizationId} not found, creating default organization`,
          error,
        );
      }
    }

    if (!organization && this.organizationRepository) {
      const organizations = await this.organizationRepository.findAll();
      if (organizations.length > 0) {
        organization = organizations[0];
      } else {
        organization = await createDefaultOrganization(
          user.id,
          this.organizationRepository,
        );
      }
    }

    let project;
    if (port.projectId && this.projectRepository) {
      try {
        project = await this.projectRepository.findById(port.projectId);
      } catch (error) {
        console.warn(
          `Project with id ${port.projectId} not found, creating default project`,
          error,
        );
      }
    }

    if (!project && this.projectRepository && organization) {
      const projects = await this.projectRepository.findAll();
      if (projects.length > 0) {
        project = projects[0];
      } else {
        project = await createDefaultProject(
          organization.id,
          user.id,
          this.projectRepository,
        );
      }
    }

    if (project != null && this.notebookRepository) {
      const notebooks = await this.notebookRepository.findByProjectId(
        project.id,
      );
      if (!notebooks || notebooks.length === 0) {
        const createNotebookUseCase = new CreateNotebookService(
          this.notebookRepository,
        );
        await createNotebookUseCase.execute({
          projectId: project.id,
          title: 'Default Notebook',
          description: 'Default notebook created automatically',
        });
      }
    }

    const runtime = await this.workspaceRuntimeUseCase.execute();

    return WorkspaceOutput.new({
      user: userDto,
      organization: organization || undefined,
      project: project || undefined,
      mode: mode,
      runtime: runtime,
      isAnonymous: isAnonymous,
    });
  }
}
