import { describe, expect, it } from 'vitest';
import { SELECT_CHART_TYPE_PROMPT } from '../../src/agents/prompts/select-chart-type.prompt';
import { GENERATE_CHART_CONFIG_PROMPT } from '../../src/agents/prompts/generate-chart-config.prompt';
import type { ChartType } from '../../src/agents/types/chart.types';

const basicMetadata = {
  columns: ['name', 'value'],
  rowCount: 2,
};

describe('chart prompts with Mustache templates', () => {
  it('renders select chart type prompt without unresolved placeholders', () => {
    const prompt = SELECT_CHART_TYPE_PROMPT(
      'show distribution',
      'select name, value from table',
      basicMetadata,
      null,
    );

    expect(prompt).toContain('You are a Chart Type Selection Agent');
    expect(prompt).toContain('Available chart types:');
    expect(prompt).toContain('Output Format:');
    expect(prompt).toContain('"chartType":');
    expect(prompt).not.toContain('{{');
    expect(prompt).not.toContain('}}');
    expect(prompt).not.toContain('"A"');
    expect(prompt).not.toContain('"B"');
  });

  it('renders generate chart config prompt without unresolved placeholders', () => {
    const chartType: ChartType = 'bar';
    const prompt = GENERATE_CHART_CONFIG_PROMPT(
      chartType,
      basicMetadata,
      'select name, value from table',
      null,
    );

    expect(prompt).toContain('You are a Chart Configuration Generator.');
    expect(prompt).toContain('Output Format (strict JSON):');
    expect(prompt).toContain('"chartType": "bar"');
    expect(prompt).toContain('"colors": string[]');
    expect(prompt).not.toContain('{{');
    expect(prompt).not.toContain('}}');
    expect(prompt).not.toContain('"A"');
    expect(prompt).not.toContain('"B"');
  });

  it('handles empty results without embedding rows', () => {
    const emptyMetadata = {
      columns: ['name', 'value'],
      rowCount: 0,
    };

    const selectPrompt = SELECT_CHART_TYPE_PROMPT(
      'show distribution',
      'select name, value from table',
      emptyMetadata,
      null,
    );
    const chartType: ChartType = 'bar';
    const configPrompt = GENERATE_CHART_CONFIG_PROMPT(
      chartType,
      emptyMetadata,
      'select name, value from table',
      null,
    );

    expect(selectPrompt).toContain('Total rows: 0');
    expect(configPrompt).toContain('Total rows: 0');
    expect(selectPrompt).not.toContain('{{');
    expect(selectPrompt).not.toContain('}}');
    expect(configPrompt).not.toContain('{{');
    expect(configPrompt).not.toContain('}}');
  });
});
