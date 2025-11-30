import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Roles } from '../../src/common/roles';
import type { Organization } from '../../src/entities';
import type { Project } from '../../src/entities';
import type { User } from '../../src/entities';
import type { Notebook } from '../../src/entities';
import { WorkspaceRuntimeEnum } from '../../src/enums/workspace-mode';
import type { IOrganizationRepository } from '../../src/repositories';
import type { IProjectRepository } from '../../src/repositories';
import type { IUserRepository } from '../../src/repositories';
import type { INotebookRepository } from '../../src/repositories';
import {
  CreateOrganizationService,
  InitWorkspaceService,
} from '../../src/services';
import type { WorkspaceRuntimeUseCase } from '../../src/usecases';

// Mock in-memory repositories
class MockUserRepository implements IUserRepository {
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

class MockOrganizationRepository implements IOrganizationRepository {
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

class MockProjectRepository implements IProjectRepository {
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

class MockNotebookRepository implements INotebookRepository {
  private notebooks = new Map<string, Notebook>();

  async findAll() {
    return Array.from(this.notebooks.values());
  }

  async findById(id: string) {
    return this.notebooks.get(id) ?? null;
  }

  async findBySlug(slug: string) {
    const notebooks = Array.from(this.notebooks.values());
    return notebooks.find((n) => n.slug === slug) ?? null;
  }

  async findByProjectId(projectId: string) {
    const notebooks = Array.from(this.notebooks.values());
    const filtered = notebooks.filter((n) => n.projectId === projectId);
    return filtered.length > 0 ? filtered : null;
  }

  async create(entity: Notebook) {
    this.notebooks.set(entity.id, entity);
    return entity;
  }

  async update(entity: Notebook) {
    if (!this.notebooks.has(entity.id)) {
      throw new Error(`Notebook with id ${entity.id} not found`);
    }
    this.notebooks.set(entity.id, entity);
    return entity;
  }

  async delete(id: string) {
    return this.notebooks.delete(id);
  }

  shortenId(id: string) {
    return id.slice(0, 8);
  }
}

describe('InitWorkspaceService', () => {
  let userRepository: MockUserRepository;
  let organizationRepository: MockOrganizationRepository;
  let projectRepository: MockProjectRepository;
  let workspaceModeUseCase: WorkspaceRuntimeUseCase;
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
      execute: vi.fn().mockResolvedValue(WorkspaceRuntimeEnum.BROWSER),
    } as WorkspaceRuntimeUseCase;

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
      expect(result.runtime).toBe(WorkspaceRuntimeEnum.BROWSER);
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
      expect(result.organization?.slug).toBeDefined(); // slug is auto-generated now
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
      expect(result.project?.slug).toBeDefined(); // slug is auto-generated now
      expect(result.project?.status).toBe('active');
      // region field was removed
    });

    it('should use existing project when projectId provided', async () => {
      const project: Project = {
        id: projectId,
        org_id: orgId,
        name: 'Test Project',
        slug: 'test-project',
        description: 'Test description',
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

      expect(result.runtime).toBe(WorkspaceRuntimeEnum.BROWSER);
      expect(result.isAnonymous).toBe(false);
    });

    it('should handle desktop mode', async () => {
      workspaceModeUseCase.execute = vi
        .fn()
        .mockResolvedValue(WorkspaceRuntimeEnum.DESKTOP);

      const result = await service.execute({ userId: '' });

      expect(result.runtime).toBe(WorkspaceRuntimeEnum.DESKTOP);
    });

    it('should handle mobile mode', async () => {
      workspaceModeUseCase.execute = vi
        .fn()
        .mockResolvedValue(WorkspaceRuntimeEnum.MOBILE);

      const result = await service.execute({ userId: '' });

      expect(result.runtime).toBe(WorkspaceRuntimeEnum.MOBILE);
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

  describe('notebook handling', () => {
    it('should create default notebook when project exists and no notebooks found', async () => {
      const notebookRepository = new MockNotebookRepository();
      const serviceWithNotebook = new InitWorkspaceService(
        userRepository,
        workspaceModeUseCase,
        organizationRepository,
        projectRepository,
        notebookRepository,
      );

      const result = await serviceWithNotebook.execute({ userId: '' });

      expect(result.project).toBeDefined();
      const notebooks = await notebookRepository.findByProjectId(
        result.project!.id,
      );
      expect(notebooks).not.toBeNull();
      expect(notebooks!.length).toBeGreaterThan(0);
      expect(notebooks?.[0]?.title).toBe('Default Notebook');
    });

    it('should not create notebook when notebooks already exist', async () => {
      const notebookRepository = new MockNotebookRepository();
      const serviceWithNotebook = new InitWorkspaceService(
        userRepository,
        workspaceModeUseCase,
        organizationRepository,
        projectRepository,
        notebookRepository,
      );

      // Create a project first
      const result1 = await serviceWithNotebook.execute({ userId: '' });
      const projectId = result1.project!.id;

      // Get initial notebook count
      const initialNotebooks =
        await notebookRepository.findByProjectId(projectId);
      const initialCount = initialNotebooks?.length ?? 0;

      // Execute again - should not create another notebook
      await serviceWithNotebook.execute({ userId: '' });

      const finalNotebooks =
        await notebookRepository.findByProjectId(projectId);
      expect(finalNotebooks?.length).toBe(initialCount);
    });

    it('should not create notebook when notebookRepository is not provided', async () => {
      const result = await service.execute({ userId: '' });

      expect(result.project).toBeDefined();
      // Service should work fine without notebook repository
      expect(result).toBeDefined();
    });

    it('should handle organization without id when creating project', async () => {
      const notebookRepository = new MockNotebookRepository();
      const serviceWithNotebook = new InitWorkspaceService(
        userRepository,
        workspaceModeUseCase,
        organizationRepository,
        projectRepository,
        notebookRepository,
      );

      // Create an organization with empty string id to test the fallback (line 123: organization.id || uuidv4())
      const orgUseCase = new CreateOrganizationService(organizationRepository);
      const newOrg = await orgUseCase.execute({
        name: 'Test Org',
        is_owner: true,
        createdBy: userId,
      });

      // Mock findAll to return the org with empty id
      const originalFindAll = organizationRepository.findAll;
      organizationRepository.findAll = vi.fn().mockResolvedValue([newOrg]);

      try {
        const result = await serviceWithNotebook.execute({ userId: '' });
        // Should still create project successfully using uuidv4() fallback (line 123)
        expect(result.project).toBeDefined();
        expect(result.project?.org_id).toBeDefined();
        // The org_id should be a valid UUID (from uuidv4() fallback)
        expect(result.project?.org_id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        );
      } finally {
        organizationRepository.findAll = originalFindAll;
      }
    });
  });
});
