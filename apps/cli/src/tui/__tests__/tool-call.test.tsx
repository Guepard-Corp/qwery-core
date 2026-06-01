import { describe, expect, test } from 'bun:test';
import type { ToolEvent } from '@qwery/domain';
import { Box } from 'ink';
import { render } from 'ink-testing-library';
import type { ReactNode } from 'react';
import { oneLine, PRIVACY_SAFE, toolCallLine } from '../tool-call';
import { plain } from './_ansi';

const baseEvent = (over: Partial<ToolEvent>): ToolEvent =>
  ({ name: 'runQuery', status: 'done', startedAt: 0, endedAt: 50, input: {}, ...over }) as ToolEvent;

function rows(node: ReactNode): string[] {
  const { lastFrame } = render(<Box>{node}</Box>);
  return plain(lastFrame()).split('\n');
}

describe('oneLine', () => {
  test('collapses newlines and whitespace runs', () => {
    expect(oneLine('a\n  b\t c   d')).toBe('a b c d');
    expect(oneLine('  trimmed  ')).toBe('trimmed');
  });
});

describe('toolCallLine', () => {
  test('renders a multi-line error as a single row', () => {
    const event = baseEvent({
      status: 'error',
      output: {
        kind: 'error',
        message: 'Catalog Error: Table "public.x" does not exist.\nLINE 11: FROM public.x;\n      ^',
      },
    });
    const out = rows(toolCallLine(event, false));
    // The error's embedded newlines must be collapsed onto one row, otherwise
    // the chat line-flattener (1 node = 1 row) would miscount its height.
    expect(out.length).toBe(1);
    expect(out[0]).toContain('Catalog Error');
    expect(out[0]).toContain('LINE 11'); // collapsed onto the same row, not a new one
  });

  test('renders a dbAudit summary exactly once (no meta/preview duplication)', () => {
    const event = baseEvent({
      name: 'validateRemediationInGfsCli',
      output: { kind: 'dbAudit', summary: 'Validated remediation in GFS branch gfs_audit_x.' },
    });
    const text = rows(toolCallLine(event, true)).join('\n');
    const occurrences = text.split('Validated remediation in GFS branch gfs_audit_x.').length - 1;
    expect(occurrences).toBe(1);
  });

  test('shows the privacy lock only for privacy-safe tools', () => {
    const safe = rows(toolCallLine(baseEvent({ name: 'getTopSlowQueries' }), true)).join('');
    const unsafe = rows(toolCallLine(baseEvent({ name: 'bash' }), false)).join('');
    expect(safe).toContain('🔒');
    expect(unsafe).not.toContain('🔒');
  });

  test('PRIVACY_SAFE marks read-only audit tools, not write tools', () => {
    expect(PRIVACY_SAFE.has('getTopSlowQueries')).toBe(true);
    expect(PRIVACY_SAFE.has('validateRemediationInGfsCli')).toBe(true);
    expect(PRIVACY_SAFE.has('bash')).toBe(false);
    expect(PRIVACY_SAFE.has('runQuery')).toBe(false);
  });
});
