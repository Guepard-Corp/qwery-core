import { Hono } from 'hono';
import { InitWorkspaceService } from '@qwery/domain/services';
import { WorkspaceRuntimeEnum } from '@qwery/domain/enums';
import type { Repositories } from '@qwery/domain/repositories';
import type { WorkspaceRuntimeUseCase } from '@qwery/domain/usecases';
import { handleDomainException } from '../lib/http-utils';

type InitRequestBody = {
  userId?: string;
  organizationId?: string;
  projectId?: string;
  mode?: string;
  runtime?: WorkspaceRuntimeEnum;
};

function isInitRequestBody(value: unknown): value is InitRequestBody {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (v.userId !== undefined && typeof v.userId !== 'string') return false;
  if (v.organizationId !== undefined && typeof v.organizationId !== 'string')
    return false;
  if (v.projectId !== undefined && typeof v.projectId !== 'string')
    return false;
  if (v.mode !== undefined && typeof v.mode !== 'string') return false;
  if (
    v.runtime !== undefined &&
    !Object.values(WorkspaceRuntimeEnum).includes(
      v.runtime as WorkspaceRuntimeEnum,
    )
  )
    return false;
  return true;
}

export function createInitRoutes(getRepositories: () => Promise<Repositories>) {
  const app = new Hono();

  app.post('/', async (c) => {
    try {
      const repos = await getRepositories();
      const body = (await c.req.json().catch(() => ({}))) as unknown;

      const workspaceInput = isInitRequestBody(body)
        ? {
            userId: body.userId ?? '',
            organizationId: body.organizationId,
            projectId: body.projectId,
            mode: body.mode,
          }
        : { userId: '' };

      const runtime =
        isInitRequestBody(body) && body.runtime
          ? body.runtime
          : WorkspaceRuntimeEnum.BROWSER;

      const workspaceRuntimeUseCase: WorkspaceRuntimeUseCase = {
        execute: async () => runtime,
      };

      const initWorkspaceService = new InitWorkspaceService(
        repos.user,
        workspaceRuntimeUseCase,
        repos.organization,
        repos.project,
      );

      const workspace = await initWorkspaceService.execute(workspaceInput);
      return c.json(workspace, 200);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  return app;
}
