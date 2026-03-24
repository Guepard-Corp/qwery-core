import { DATASOURCE_INPUT_MAX_LENGTH } from '@qwery/extensions-sdk';
import { z } from 'zod';

export const schema = z.object({
  sharedLink: z
    .string()
    .max(DATASOURCE_INPUT_MAX_LENGTH.sharedLink)
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
