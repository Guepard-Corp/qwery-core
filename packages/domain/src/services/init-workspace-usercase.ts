import { v4 as uuidv4 } from 'uuid';

import { Roles } from '../common/roles';
import {
  Organization,
  OrganizationEntity,
} from '../entities/organization.type';
import { Project, ProjectEntity } from '../entities/project.type';
import { User } from '../entities/user.type';
import { OrganizationRepositoryPort } from '../repositories/organization-repository.port';
import { ProjectRepositoryPort } from '../repositories/project-repository.port';
import { UserRepositoryPort } from '../repositories/user-repository.port';
import { UserUseCaseDto } from '../usecases/dto/user-usecase-dto';
import { WorkspaceUseCaseDto } from '../usecases/dto/workspace-usecase-dto';
import {
  InitWorkspaceUseCase,
  WorkspacePort,
} from '../usecases/init-workspace-usecase';
import { WorkspaceModeUseCase } from '../usecases/workspace-mode.usecase';

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

function createDefaultOrganization(userId: string): Organization {
  const organization = OrganizationEntity.new({
    name: 'Default Organization',
    slug: 'default',
    is_owner: true,
    createdBy: userId,
  });

  return organization.toDto<Organization>();
}

function createDefaultProject(orgId: string, userId: string): Project {
  const project = ProjectEntity.new({
    org_id: orgId,
    name: 'Default Project',
    slug: 'default',
    description: 'Default project created automatically',
    region: 'us-east-1',
    status: 'active',
    createdBy: userId,
  });

  return project.toDto<Project>();
}

export class InitWorkspaceService implements InitWorkspaceUseCase {
  constructor(
    private readonly userRepository: UserRepositoryPort,
    private readonly workspaceModeUseCase: WorkspaceModeUseCase,
    private readonly organizationRepository?: OrganizationRepositoryPort,
    private readonly projectRepository?: ProjectRepositoryPort,
  ) {}

  public async execute(port: WorkspacePort): Promise<WorkspaceUseCaseDto> {
    let user: User | null = null;
    let isAnonymous = false;

    if (port.userId) {
      user = await this.userRepository.findById(port.userId);
    }

    if (!user) {
      user = createAnonymousUser();
      isAnonymous = true;
    }

    const userDto = UserUseCaseDto.new(user);

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
        const defaultOrg = createDefaultOrganization(user.id);
        organization = await this.organizationRepository.create(defaultOrg);
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
        const defaultProject = createDefaultProject(
          organization.id || uuidv4(),
          user.id,
        );
        project = await this.projectRepository.create(defaultProject);
      }
    }

    const mode = await this.workspaceModeUseCase.execute();

    return WorkspaceUseCaseDto.new({
      user: userDto,
      organization: organization || undefined,
      project: project || undefined,
      mode: mode,
      isAnonymous: isAnonymous,
    });
  }
}
