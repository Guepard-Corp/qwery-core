import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Roles } from '../../src/common/roles';
import type { Organization } from '../../src/entities/organization.type';
import type { Project } from '../../src/entities/project.type';
import type { User } from '../../src/entities/user.type';
import { WorkspaceModeEnum } from '../../src/enums/workspace-mode';
import type { OrganizationRepositoryPort } from '../../src/repositories/organization-repository.port';
import type { ProjectRepositoryPort } from '../../src/repositories/project-repository.port';
import type { UserRepositoryPort } from '../../src/repositories/user-repository.port';
import { InitWorkspaceService } from '../../src/services/init-workspace-usercase';
import type { WorkspaceModeUseCase } from '../../src/usecases/workspace-mode.usecase';

// Mock in-memory repositories
class MockUserRepository implements UserRepositoryPort {
  private users = new Map<string, User>();

  async findAll() {
    return Array.from(this.users.values());
  }

  async findById(id: string) {
    return this.users.get(id) ?? null;
  }

  async findBySlug(slug: string) {
    const users = Array.from(this.users.values());
    return users.find((user) => user.username === slug) ?? null;
  }

  async create(entity: User) {
    this.users.set(entity.id, entity);
    return entity;
  }

  async update(entity: User) {
    if (!this.users.has(entity.id)) {
      throw new Error(`User with id ${entity.id} not found`);
    }
    this.users.set(entity.id, entity);
    return entity;
  }

  async delete(id: string) {
    return this.users.delete(id);
  }

  shortenId(id: string) {
    return id.slice(0, 8);
  }
}

class MockOrganizationRepository implements OrganizationRepositoryPort {
  private organizations = new Map<string, Organization>();

  async findAll() {
    return Array.from(this.organizations.values());
  }

  async findById(id: string) {
    return this.organizations.get(id) ?? null;
  }

  async findBySlug(slug: string) {
    const orgs = Array.from(this.organizations.values());
    return orgs.find((org) => org.slug === slug) ?? null;
  }

  async create(entity: Organization) {
    this.organizations.set(entity.id, entity);
    return entity;
  }

  async update(entity: Organization) {
    if (!this.organizations.has(entity.id)) {
      throw new Error(`Organization with id ${entity.id} not found`);
    }
    this.organizations.set(entity.id, entity);
    return entity;
  }

  async delete(id: string) {
    return this.organizations.delete(id);
  }

  shortenId(id: string) {
    return id.slice(0, 8);
  }
}

class MockProjectRepository implements ProjectRepositoryPort {
  private projects = new Map<string, Project>();

  async findAll() {
    return Array.from(this.projects.values());
  }

  async findById(id: string) {
    return this.projects.get(id) ?? null;
  }

  async findBySlug(slug: string) {
    const projects = Array.from(this.projects.values());
    return projects.find((project) => project.slug === slug) ?? null;
  }

  async create(entity: Project) {
    this.projects.set(entity.id, entity);
    return entity;
  }

  async update(entity: Project) {
    if (!this.projects.has(entity.id)) {
      throw new Error(`Project with id ${entity.id} not found`);
    }
    this.projects.set(entity.id, entity);
    return entity;
  }

  async delete(id: string) {
    return this.projects.delete(id);
  }

  shortenId(id: string) {
    return id.slice(0, 8);
  }
}

describe('InitWorkspaceService', () => {
  let userRepository: MockUserRepository;
  let organizationRepository: MockOrganizationRepository;
  let projectRepository: MockProjectRepository;
  let workspaceModeUseCase: WorkspaceModeUseCase;
  let service: InitWorkspaceService;

  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const orgId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const projectId = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

  beforeEach(() => {
    userRepository = new MockUserRepository();
    organizationRepository = new MockOrganizationRepository();
    projectRepository = new MockProjectRepository();

    // Mock workspace mode usecase
    workspaceModeUseCase = {
      execute: vi.fn().mockResolvedValue(WorkspaceModeEnum.BROWSER),
    } as WorkspaceModeUseCase;

    service = new InitWorkspaceService(
      userRepository,
      workspaceModeUseCase,
      organizationRepository,
      projectRepository,
    );
  });

  describe('with no user', () => {
    it('should create anonymous user when no userId provided', async () => {
      const result = await service.execute({ userId: '' });

      expect(result.user).toBeDefined();
      expect(result.user.username).toBe('anonymous');
      expect(result.user.role).toBe(Roles.SUPER_ADMIN);
      expect(result.isAnonymous).toBe(true);
      expect(result.mode).toBe(WorkspaceModeEnum.BROWSER);
    });

    it('should create anonymous user when userId not found', async () => {
      const result = await service.execute({ userId: 'nonexistent-id' });

      expect(result.user).toBeDefined();
      expect(result.user.username).toBe('anonymous');
      expect(result.user.role).toBe(Roles.SUPER_ADMIN);
      expect(result.isAnonymous).toBe(true);
    });
  });

  describe('with existing user', () => {
    it('should use existing user when userId provided', async () => {
      const user: User = {
        id: userId,
        username: 'testuser',
        role: Roles.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await userRepository.create(user);

      const result = await service.execute({ userId });

      expect(result.user).toBeDefined();
      expect(result.user.id).toBe(userId);
      expect(result.user.username).toBe('testuser');
      expect(result.user.role).toBe(Roles.USER);
      expect(result.isAnonymous).toBe(false);
    });
  });

  describe('organization handling', () => {
    it('should create default organization when none exist', async () => {
      const result = await service.execute({ userId: '' });

      expect(result.organization).toBeDefined();
      expect(result.organization?.name).toBe('Default Organization');
      expect(result.organization?.slug).toBe('default');
      expect(result.organization?.is_owner).toBe(true);
    });

    it('should use existing organization when organizationId provided', async () => {
      const org: Organization = {
        id: orgId,
        name: 'Test Org',
        slug: 'test-org',
        is_owner: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        updatedBy: userId,
      };

      await organizationRepository.create(org);

      const result = await service.execute({
        userId: '',
        organizationId: orgId,
      });

      expect(result.organization).toBeDefined();
      expect(result.organization?.id).toBe(orgId);
      expect(result.organization?.name).toBe('Test Org');
      expect(result.organization?.slug).toBe('test-org');
    });

    it('should use first organization when multiple exist and no organizationId provided', async () => {
      const org1: Organization = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'First Org',
        slug: 'first-org',
        is_owner: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        updatedBy: userId,
      };

      const org2: Organization = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Second Org',
        slug: 'second-org',
        is_owner: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        updatedBy: userId,
      };

      await organizationRepository.create(org1);
      await organizationRepository.create(org2);

      const result = await service.execute({ userId: '' });

      expect(result.organization).toBeDefined();
      expect(result.organization?.name).toBe('First Org');
    });

    it('should create default organization when organizationId not found', async () => {
      const result = await service.execute({
        userId: '',
        organizationId: 'nonexistent-org-id',
      });

      expect(result.organization).toBeDefined();
      expect(result.organization?.name).toBe('Default Organization');
    });
  });

  describe('project handling', () => {
    beforeEach(async () => {
      // Create organization first for project tests
      const org: Organization = {
        id: orgId,
        name: 'Test Org',
        slug: 'test-org',
        is_owner: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        updatedBy: userId,
      };
      await organizationRepository.create(org);
    });

    it('should create default project when none exist', async () => {
      const result = await service.execute({ userId: '' });

      expect(result.project).toBeDefined();
      expect(result.project?.name).toBe('Default Project');
      expect(result.project?.slug).toBe('default');
      expect(result.project?.status).toBe('active');
      expect(result.project?.region).toBe('us-east-1');
    });

    it('should use existing project when projectId provided', async () => {
      const project: Project = {
        id: projectId,
        org_id: orgId,
        name: 'Test Project',
        slug: 'test-project',
        description: 'Test description',
        region: 'us-west-2',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        updatedBy: userId,
      };

      await projectRepository.create(project);

      const result = await service.execute({
        userId: '',
        projectId: projectId,
      });

      expect(result.project).toBeDefined();
      expect(result.project?.id).toBe(projectId);
      expect(result.project?.name).toBe('Test Project');
      expect(result.project?.slug).toBe('test-project');
    });

    it('should use first project when multiple exist and no projectId provided', async () => {
      const project1: Project = {
        id: '7c9e6679-7425-40de-944b-e07fc1f90ae1',
        org_id: orgId,
        name: 'First Project',
        slug: 'first-project',
        description: 'First project',
        region: 'us-east-1',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        updatedBy: userId,
      };

      const project2: Project = {
        id: '7c9e6679-7425-40de-944b-e07fc1f90ae2',
        org_id: orgId,
        name: 'Second Project',
        slug: 'second-project',
        description: 'Second project',
        region: 'us-west-2',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        updatedBy: userId,
      };

      await projectRepository.create(project1);
      await projectRepository.create(project2);

      const result = await service.execute({ userId: '' });

      expect(result.project).toBeDefined();
      expect(result.project?.name).toBe('First Project');
    });

    it('should create default project when projectId not found', async () => {
      const result = await service.execute({
        userId: '',
        projectId: 'nonexistent-project-id',
      });

      expect(result.project).toBeDefined();
      expect(result.project?.name).toBe('Default Project');
    });
  });

  describe('complete workspace initialization', () => {
    it('should initialize complete workspace with user, org, and project', async () => {
      const user: User = {
        id: userId,
        username: 'testuser',
        role: Roles.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const org: Organization = {
        id: orgId,
        name: 'Test Org',
        slug: 'test-org',
        is_owner: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        updatedBy: userId,
      };

      const project: Project = {
        id: projectId,
        org_id: orgId,
        name: 'Test Project',
        slug: 'test-project',
        description: 'Test description',
        region: 'us-west-2',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        updatedBy: userId,
      };

      await userRepository.create(user);
      await organizationRepository.create(org);
      await projectRepository.create(project);

      const result = await service.execute({
        userId,
        organizationId: orgId,
        projectId: projectId,
      });

      expect(result.user).toBeDefined();
      expect(result.user.id).toBe(userId);
      expect(result.user.username).toBe('testuser');

      expect(result.organization).toBeDefined();
      expect(result.organization?.id).toBe(orgId);
      expect(result.organization?.name).toBe('Test Org');

      expect(result.project).toBeDefined();
      expect(result.project?.id).toBe(projectId);
      expect(result.project?.name).toBe('Test Project');

      expect(result.mode).toBe(WorkspaceModeEnum.BROWSER);
      expect(result.isAnonymous).toBe(false);
    });

    it('should handle desktop mode', async () => {
      workspaceModeUseCase.execute = vi
        .fn()
        .mockResolvedValue(WorkspaceModeEnum.DESKTOP);

      const result = await service.execute({ userId: '' });

      expect(result.mode).toBe(WorkspaceModeEnum.DESKTOP);
    });

    it('should handle mobile mode', async () => {
      workspaceModeUseCase.execute = vi
        .fn()
        .mockResolvedValue(WorkspaceModeEnum.MOBILE);

      const result = await service.execute({ userId: '' });

      expect(result.mode).toBe(WorkspaceModeEnum.MOBILE);
    });
  });

  describe('without optional repositories', () => {
    it('should work without organization repository', async () => {
      const serviceWithoutOrg = new InitWorkspaceService(
        userRepository,
        workspaceModeUseCase,
      );

      const result = await serviceWithoutOrg.execute({ userId: '' });

      expect(result.user).toBeDefined();
      expect(result.organization).toBeUndefined();
      expect(result.project).toBeUndefined();
      expect(result.isAnonymous).toBe(true);
    });

    it('should work without project repository', async () => {
      const serviceWithoutProject = new InitWorkspaceService(
        userRepository,
        workspaceModeUseCase,
        organizationRepository,
      );

      const result = await serviceWithoutProject.execute({ userId: '' });

      expect(result.user).toBeDefined();
      expect(result.organization).toBeDefined();
      expect(result.project).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should handle repository errors gracefully for organization', async () => {
      const failingOrgRepo = new MockOrganizationRepository();
      failingOrgRepo.findById = vi
        .fn()
        .mockRejectedValue(new Error('DB error'));

      const serviceWithFailingRepo = new InitWorkspaceService(
        userRepository,
        workspaceModeUseCase,
        failingOrgRepo,
        projectRepository,
      );

      const result = await serviceWithFailingRepo.execute({
        userId: '',
        organizationId: orgId,
      });

      // Should create default organization when findById fails
      expect(result.organization).toBeDefined();
      expect(result.organization?.name).toBe('Default Organization');
    });

    it('should handle repository errors gracefully for project', async () => {
      const org: Organization = {
        id: orgId,
        name: 'Test Org',
        slug: 'test-org',
        is_owner: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        updatedBy: userId,
      };
      await organizationRepository.create(org);

      const failingProjectRepo = new MockProjectRepository();
      failingProjectRepo.findById = vi
        .fn()
        .mockRejectedValue(new Error('DB error'));

      const serviceWithFailingRepo = new InitWorkspaceService(
        userRepository,
        workspaceModeUseCase,
        organizationRepository,
        failingProjectRepo,
      );

      const result = await serviceWithFailingRepo.execute({
        userId: '',
        projectId: projectId,
      });

      // Should create default project when findById fails
      expect(result.project).toBeDefined();
      expect(result.project?.name).toBe('Default Project');
    });
  });
});
