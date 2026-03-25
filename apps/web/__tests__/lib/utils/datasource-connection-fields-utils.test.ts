import { describe, expect, it } from 'vitest';

import { expandStoredConfigForFormDefaults } from '~/lib/utils/datasource-connection-fields-utils';

describe('expandStoredConfigForFormDefaults (gsheet-csv)', () => {
  it('populates sharedLink from url when sharedLink missing', () => {
    const out = expandStoredConfigForFormDefaults('gsheet-csv', {
      url: 'https://docs.google.com/spreadsheets/d/abc/edit#gid=0',
    });
    expect(out.sharedLink).toBe(
      'https://docs.google.com/spreadsheets/d/abc/edit#gid=0',
    );
  });

  it('blanks sharedLink when it is not a sheet URL', () => {
    const out = expandStoredConfigForFormDefaults('gsheet-csv', {
      sharedLink: 'https://not-a-sheet.com/file.csv',
    });
    expect(out.sharedLink).toBe('');
  });

  it('preserves sharedLink when it is a sheet URL', () => {
    const out = expandStoredConfigForFormDefaults('gsheet-csv', {
      sharedLink: 'https://docs.google.com/spreadsheets/d/abc/edit#gid=0',
    });
    expect(out.sharedLink).toBe(
      'https://docs.google.com/spreadsheets/d/abc/edit#gid=0',
    );
  });
});
