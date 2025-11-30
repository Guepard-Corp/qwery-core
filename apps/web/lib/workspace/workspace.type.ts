import { WorkspaceModeEnum } from '@qwery/domain/enums';

export type WorkspaceOnLocalStorage = {
  id?: string;
  userId?: string;
  organizationId?: string;
  projectId?: string;
  mode?: WorkspaceModeEnum;
  isAnonymous?: boolean;
};
