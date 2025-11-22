import { WorkspaceModeEnum } from '@qwery/domain/enums';

export type WorkspaceOnLocalStorage = {
  userId?: string;
  organizationId?: string;
  projectId?: string;
  mode?: WorkspaceModeEnum;
  isAnonymous?: boolean;
};
