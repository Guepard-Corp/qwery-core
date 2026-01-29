import { z } from 'zod/v3';

export const CsrfTokenSchema = z.object({
  csrfToken: z.string(),
});
