import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ConversationPage from '../../../../../app/routes/project/conversation/conversation';

vi.mock('react-router', () => ({
  useParams: vi.fn(() => ({})),
  useNavigate: vi.fn(() => vi.fn()),
}));

vi.mock('../../../../../app/routes/project/_components/agent', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('~/lib/context/workspace-context', () => ({
  useWorkspace: vi.fn(() => ({
    repositories: {
      conversation: {} as never,
      message: {} as never,
      notebook: {} as never,
    },
    workspace: {
      id: 'workspace-1',
      userId: 'user-1',
    },
  })),
}));

vi.mock('~/lib/queries/use-get-messages', () => ({
  useGetMessagesByConversationSlug: vi.fn(),
}));

vi.mock('~/lib/queries/use-get-conversations', () => ({
  useGetConversationBySlug: vi.fn(),
}));

vi.mock('~/lib/queries/use-get-notebook', () => ({
  useGetNotebookById: vi.fn(),
}));

describe('ConversationPage slug validation', () => {
  it('throws 404 when slug param is missing', () => {
    try {
      render(<ConversationPage />);
      throw new Error('Expected ConversationPage to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      expect((error as Response).status).toBe(404);
    }
  });
});
