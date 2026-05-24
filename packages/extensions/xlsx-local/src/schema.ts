import { DATASOURCE_INPUT_MAX_LENGTH } from '@qwery/extension-sdk';
import { z } from 'zod';

export const schema = z.object({
  path: z.string().min(1).max(DATASOURCE_INPUT_MAX_LENGTH.url).meta({
    label: 'Excel file path',
    description: 'Absolute or relative path to a local .xlsx file (resolved against the working directory).',
    placeholder: 'data/report.xlsx',
  }),
  // Optional filter: when set, only this worksheet is attached. Left empty
  // (the common case), every worksheet of the workbook is attached as its own
  // view. The UI submits "" for an untouched field, so empty maps to "all".
  sheet: z
    .string()
    .max(DATASOURCE_INPUT_MAX_LENGTH.name)
    .optional()
    .transform((value) => (value && value.trim().length > 0 ? value : undefined))
    .meta({
      label: 'Sheet name (optional)',
      description: 'Restrict to a single worksheet. Leave empty to attach every sheet.',
      placeholder: 'Sales',
    }),
});

export type XlsxLocalConfig = z.infer<typeof schema>;
