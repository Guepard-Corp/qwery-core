import { DATASOURCE_INPUT_MAX_LENGTH } from '@qwery/extensions-sdk';
import { z } from 'zod';

export const schema = z.object({
  apiKey: z
    .string()
    .min(1)
    .max(DATASOURCE_INPUT_MAX_LENGTH.apiKey)
    .describe('secret:true')
    .meta({
      description: 'YouTube Data API key',
      secret: true,
    }),
  channelId: z
    .string()
    .min(1)
    .max(DATASOURCE_INPUT_MAX_LENGTH.username)
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
    .max(64)
    .datetime()
    .optional()
    .meta({
      description: 'Optional filter: published after (RFC3339)',
    }),
  publishedBefore: z
    .string()
    .max(64)
    .datetime()
    .optional()
    .meta({
      description: 'Optional filter: published before (RFC3339)',
    }),
});
