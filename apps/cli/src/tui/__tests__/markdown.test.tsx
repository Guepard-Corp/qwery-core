import { describe, expect, test } from 'bun:test';
import { render } from 'ink-testing-library';
import { Markdown } from '../markdown';
import { plain } from './_ansi';

function renderMd(text: string, width = 80): string {
  const { lastFrame } = render(<Markdown text={text} availableWidth={width} />);
  return plain(lastFrame());
}

describe('Markdown', () => {
  test('keeps intraword underscores in identifiers (not italic)', () => {
    const out = renderMd('Use passenger_id and pg_stat_statements and audit_lab.customer_activity.');
    expect(out).toContain('passenger_id');
    expect(out).toContain('pg_stat_statements');
    expect(out).toContain('audit_lab.customer_activity');
  });

  test('still renders real _emphasis_ by stripping the delimiters', () => {
    const out = renderMd('this is _emphasised_ text');
    expect(out).toContain('emphasised');
    // The surrounding underscores must be consumed, not printed literally.
    expect(out).not.toContain('_emphasised_');
  });

  test('renders bold and inline code without the markers', () => {
    const out = renderMd('a **bold** word and `code` span');
    expect(out).toContain('bold');
    expect(out).toContain('code');
    expect(out).not.toContain('**bold**');
    expect(out).not.toContain('`code`');
  });

  test('renders headings and bullets', () => {
    const out = renderMd('# Title\n\n- first\n- second');
    expect(out).toContain('Title');
    expect(out).toContain('• first');
    expect(out).toContain('• second');
  });
});
