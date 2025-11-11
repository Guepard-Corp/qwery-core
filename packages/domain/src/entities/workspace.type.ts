import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

import { Entity } from '../common/entity';
import { WorkspaceModeEnum } from '../enums/workspace-mode';

/**
 * The mode of the workspace.
 * - desktop: The workspace is running on a desktop device.
 * - mobile: The workspace is running on a mobile device.
 * - browser: The workspace is running in a browser using anonymous user.
 */
export const WorkspaceModeSchema = z.nativeEnum(WorkspaceModeEnum);

export type WorkspaceMode = z.infer<typeof WorkspaceModeSchema>;

export const WorkspaceSchema = z.object({
  id: z.string().uuid().describe('The unique identifier for the workspace'),
  userId: z.string().uuid().describe('The id of the user'),
  username: z
    .string()
    .min(1)
    .max(255)
    .default('anonymous')
    .describe('The username of the user'),
  organizationId: z
    .string()
    .uuid()
    .optional()
    .describe('The id of the organization'),
  projectId: z.string().uuid().optional().describe('The id of the project'),
  isAnonymous: z
    .boolean()
    .default(true)
    .describe('Whether the user is anonymous'),
  mode: WorkspaceModeSchema.describe('The mode of the workspace'),
});

export type Workspace = z.infer<typeof WorkspaceSchema>;

export class WorkspaceEntity extends Entity<string, typeof WorkspaceSchema> {
  public userId: string;
  public username: string;
  public organizationId: string | undefined;
  public projectId: string | undefined;
  public isAnonymous: boolean;
  public mode: WorkspaceMode;

  constructor(data: Workspace) {
    super(WorkspaceSchema, data.id);
    this.userId = data.userId;
    this.username = data.username;
    this.organizationId = data.organizationId;
    this.projectId = data.projectId;
    this.isAnonymous = data.isAnonymous;
    this.mode = data.mode;
  }

  protected getData(): Workspace {
    return {
      id: this.getId(),
      userId: this.userId,
      username: this.username,
      organizationId: this.organizationId,
      projectId: this.projectId,
      isAnonymous: this.isAnonymous,
      mode: this.mode,
    };
  }

  static new(data: Omit<Workspace, 'id'>): WorkspaceEntity {
    const isAnonymous = data.userId === undefined || data.userId === null;
    const username = isAnonymous ? 'anonymous' : data.username;

    const workspace: Workspace = {
      id: uuidv4(),
      userId: data.userId,
      username: username,
      organizationId: data.organizationId,
      projectId: data.projectId,
      isAnonymous: isAnonymous,
      mode: data.mode,
    };
    return new WorkspaceEntity(workspace);
  }
}
