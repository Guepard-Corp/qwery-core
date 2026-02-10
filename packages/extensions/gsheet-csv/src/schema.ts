import { z } from 'zod';

export const schema = z.object({
  sharedLink: z
    .string()
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
      supportsPreview: true,
      docsUrl: 'https://support.google.com/docs/answer/2494822',
    }),
});
