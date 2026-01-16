import type { ChatStatus } from 'ai';

export type ChatStatusValue = NonNullable<ChatStatus>;

export function isChatActive(status: ChatStatus | undefined): boolean {
  return status === 'streaming' || status === 'submitted';
}

export function isChatStreaming(status: ChatStatus | undefined): boolean {
  return status === 'streaming';
}

export function isChatSubmitted(status: ChatStatus | undefined): boolean {
  return status === 'submitted';
}

export function isResponseInProgress(
  status: ChatStatus | undefined,
): boolean {
  return isChatActive(status);
}

export function isChatIdle(status: ChatStatus | undefined): boolean {
  return !isChatActive(status);
}

export interface ChatStatusConfig {
  showRegenerateButton: boolean;
  showLoading: boolean;
  disableInput: boolean;
  hideRegenerateOnLastMessage: boolean;
}

export function getChatStatusConfig(
  status: ChatStatus | undefined,
): ChatStatusConfig {
  if (isChatStreaming(status)) {
    return {
      showRegenerateButton: false,
      showLoading: true,
      disableInput: true,
      hideRegenerateOnLastMessage: true,
    };
  }

  if (isChatSubmitted(status)) {
    return {
      showRegenerateButton: false,
      showLoading: true,
      disableInput: true,
      hideRegenerateOnLastMessage: true,
    };
  }
  return {
    showRegenerateButton: true,
    showLoading: false,
    disableInput: false,
    hideRegenerateOnLastMessage: false,
  };
}

