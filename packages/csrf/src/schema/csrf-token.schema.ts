import { z } from 'zod';

export const CsrfTokenSchema = z.object({
  csrfToken: z.string(),
});
