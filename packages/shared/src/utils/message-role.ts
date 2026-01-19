import { MessageRole } from '@qwery/domain/entities';

export type UIMessageRole = 'user' | 'assistant' | 'system';

export const UI_MESSAGE_ROLES: readonly UIMessageRole[] = [
  'user',
  'assistant',
  'system',
] as const;

export function messageRoleToUIRole(role: MessageRole): UIMessageRole {
  return role as UIMessageRole;
}

export function uiRoleToMessageRole(role: UIMessageRole): MessageRole {
  switch (role) {
    case 'user':
      return MessageRole.USER;
    case 'assistant':
      return MessageRole.ASSISTANT;
    case 'system':
      return MessageRole.SYSTEM;
    default:
      return MessageRole.ASSISTANT;
  }
}

export function normalizeUIRole(role: unknown): UIMessageRole {
  if (
    typeof role === 'string' &&
    UI_MESSAGE_ROLES.includes(role as UIMessageRole)
  ) {
    return role as UIMessageRole;
  }
  return 'assistant';
}

export function isUIMessageRole(value: unknown): value is UIMessageRole {
  return (
    typeof value === 'string' &&
    UI_MESSAGE_ROLES.includes(value as UIMessageRole)
  );
}

