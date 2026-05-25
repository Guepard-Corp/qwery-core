import { DATASOURCE_INPUT_MAX_LENGTH } from '@qwery/extension-sdk';
import { z } from 'zod';

export const schema = z.object({
  sharedLink: z.string().min(1).max(DATASOURCE_INPUT_MAX_LENGTH.sharedLink).url().meta({
    label: 'Shared link',
    description:
      'Public Google Sheets shared link (https://docs.google.com/spreadsheets/d/...). Add ?gid=… to target a specific tab.',
    placeholder: 'https://docs.google.com/spreadsheets/d/.../edit?usp=sharing',
  }),
});

export type GsheetCsvConfig = z.infer<typeof schema>;
