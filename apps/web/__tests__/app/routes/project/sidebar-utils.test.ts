import { describe, expect, it } from 'vitest';

import { sortSidebarConversations } from '../../../../app/routes/project/_components/sidebar-utils';

describe('sortSidebarConversations', () => {
  it('orders conversations by latest update time', () => {
    const sorted = sortSidebarConversations([
      {
        id: 'older-clicked',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      },
      {
        id: 'latest-message',
        createdAt: new Date('2026-01-03T00:00:00.000Z'),
        updatedAt: new Date('2026-01-10T00:00:00.000Z'),
      },
    ]);

    expect(sorted.map((conversation) => conversation.id)).toEqual([
      'latest-message',
      'older-clicked',
    ]);
  });

  it('falls back to creation time when update time is missing', () => {
    const sorted = sortSidebarConversations([
      {
        id: 'older-created',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      {
        id: 'newer-created',
        createdAt: new Date('2026-01-05T00:00:00.000Z'),
      },
    ]);

    expect(sorted.map((conversation) => conversation.id)).toEqual([
      'newer-created',
      'older-created',
    ]);
  });
});
