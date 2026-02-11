import { z } from 'zod';

export const schema = z.object({
  apiKey: z
    .string()
    .min(1)
    .describe('secret:true')
    .meta({
      description: 'YouTube Data API key',
      secret: true,
    }),
  channelId: z
    .string()
    .min(1)
    .meta({
      description: 'Channel ID (e.g., UC...)',
    }),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(25)
    .meta({
      description: 'Max videos to load (default 25)',
    }),
  publishedAfter: z
    .string()
    .datetime()
    .optional()
    .meta({
      description: 'Optional filter: published after (RFC3339)',
    }),
  publishedBefore: z
    .string()
    .datetime()
    .optional()
    .meta({
      description: 'Optional filter: published before (RFC3339)',
    }),
});
