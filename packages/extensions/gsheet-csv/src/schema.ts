import { z } from 'zod';

export const schema = z.object({
  sharedLink: z
    .url()
    .meta({
      description:
        'Public Google Sheets shared link (https://docs.google.com/spreadsheets/d/...)',
      i18n: {
        fr: 'Lien partagé',
        en: 'Shared link',
      },
      placeholder:
        'https://docs.google.com/spreadsheets/d/.../edit?usp=sharing',
    }),
});
