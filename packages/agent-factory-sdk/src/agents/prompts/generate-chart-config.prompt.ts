import type { ChartType } from '../types/chart.types';
import {
  getChartGenerationPrompt,
  getChartDefinition,
  getAxesLabelsPrecisionGuidelines,
} from '../config/supported-charts';
import { renderTemplate } from './template-engine';

const GENERATE_CHART_CONFIG_TEMPLATE = `You are a Chart Configuration Generator. Your task is to design a chart configuration JSON that can be rendered by React/Recharts components, using only query results metadata (columns and row counts).

Selected Chart Type: **{{chartType}}**

Chart Type Requirements:
{{chartDescription}}
Data format structure: {{dataFormatExampleJson}}

SQL Query: {{sqlQuery}}

Query Results:
- Columns: {{columnsJson}}
- Total rows: {{rowCount}}
- Note: You do NOT see full row-level data. Base your decisions only on the column names, row counts, chart definitions, and business context.

Chart Configuration Guidelines:

**Generic Structure (applies to all chart types):**
- chartType: "{{chartType}}"
- title: Optional descriptive title for the chart (e.g., "Students per Major", "Sales Trends Over Time")
  - Should be concise (3-8 words)
  - Should clearly describe what the chart shows
  - Use Title Case
- config: Configuration object with colors, labels, and chart-specific keys

{{chartGenerationPrompt}}

**Data Transformation:**
1. Select which columns should be used for the x-axis / categories and y-axis / values (or name/value for pie charts)
2. The system will transform rows into chart data format using the keys you specify in the config
3. Focus on choosing semantically correct keys; you do NOT need to generate the data array

**Configuration (Concise):**
- colors: Use actual hex color values (e.g., ["#8884d8", "#82ca9d", "#ffc658", "#ff7c7c", "#8dd1e1"])
  - DO NOT use CSS variables like "hsl(var(--chart-1))" as Recharts SVG doesn't support them
  - Use hex colors like "#8884d8" or rgb colors like "rgb(136, 132, 216)"
  - Provide an array of 3-5 colors for variety
- labels: Map column names to human-readable labels (REQUIRED - see precision guidelines below)
{{#businessContext}}
  {{#hasVocabulary}}
- Use business context vocabulary to improve labels:
  * Domain: {{domain}}
  * Vocabulary mappings (technical column → business term):
{{#vocabulary}}
  - "{{businessTerm}}" → [{{technicalTermsList}}]{{#hasSynonyms}} (synonyms: {{synonymsList}}){{/hasSynonyms}}
{{/vocabulary}}
  * When creating labels, check if a column name matches any technical term in the vocabulary
  * If found, use the business term as the label (e.g., if column is "user_id" and vocabulary maps "user" → "Customer", use "Customer" as the label)
  * Example: Column "user_id" → Look up "user" in vocabulary → Find "Customer" → Use "Customer" as label
  {{/hasVocabulary}}
  {{^hasVocabulary}}
- Use business context to improve labels:
  * Domain: {{domain}}
  * Use domain understanding to create meaningful labels
  {{/hasVocabulary}}
{{/businessContext}}
- Include chart-specific keys: {{requiredKeysList}}
{{#businessContext}}

**Business Context:**
- Domain: {{domain}}
- Key entities: {{entitiesList}}
- Use vocabulary mappings to translate technical column names to business-friendly labels
- Use domain understanding to create meaningful chart titles
{{/businessContext}}

{{axesGuidelines}}

Output Format (strict JSON):
{
  "chartType": "{{chartType}}",
  "title"?: string,
  "config": {
    "colors": string[],
    "labels"?: Record<string, string>,
{{requiredKeysLines}}
  }
}

**IMPORTANT**: Do NOT generate or return the data array. Only return chartType, optional title, and config. The system will transform ALL query results rows into chart data format based on the keys you specify.

Current date: {{currentDate}}
Version: 1.0.0
`;

type VocabularyEntry = {
  businessTerm: string;
  technicalTerms: string[];
  synonyms: string[];
};
type EntityEntry = { name: string };
type BusinessContextForPrompt = {
  domain: { domain: string };
  vocabulary?: Map<string, VocabularyEntry>;
  entities?: Map<string, EntityEntry>;
};

export const GENERATE_CHART_CONFIG_PROMPT = (
  chartType: ChartType,
  metadata: {
    columns: string[];
    rowCount: number;
  },
  sqlQuery: string,
  businessContext?: BusinessContextForPrompt | null,
) => {
  const chartDef = getChartDefinition(chartType);
  if (!chartDef) {
    throw new Error(`Unsupported chart type: ${chartType}`);
  }

  const vocabulary =
    businessContext && businessContext.vocabulary
      ? (
          Array.from(businessContext.vocabulary.entries()) as [
            string,
            VocabularyEntry,
          ][]
        )
          .map(([, entry]) => ({
            businessTerm: entry.businessTerm,
            technicalTermsList: entry.technicalTerms.join(', '),
            synonymsList: entry.synonyms.join(', '),
            hasSynonyms: entry.synonyms.length > 0,
          }))
          .sort((a, b) => a.businessTerm.localeCompare(b.businessTerm))
      : [];

  const entitiesList =
    businessContext && businessContext.entities
      ? (Array.from(businessContext.entities.values()) as EntityEntry[])
          .map((e) => e.name)
          .join(', ')
      : '';

  const requiredKeysLines = chartDef.requirements.requiredKeys
    .map((key) => `    "${key}": string`)
    .join(',\n');

  const context = {
    chartType,
    chartDescription: chartDef.dataFormat.description,
    dataFormatExampleJson: JSON.stringify(chartDef.dataFormat.example, null, 2),
    sqlQuery,
    columnsJson: JSON.stringify(metadata.columns),
    rowCount: metadata.rowCount,
    chartGenerationPrompt: getChartGenerationPrompt(chartType),
    axesGuidelines: getAxesLabelsPrecisionGuidelines(),
    requiredKeysList: chartDef.requirements.requiredKeys.join(', '),
    requiredKeysLines,
    businessContext:
      businessContext && businessContext.domain
        ? {
            domain: businessContext.domain.domain,
            hasVocabulary: vocabulary.length > 0,
            vocabulary,
            entitiesList,
          }
        : null,
    currentDate: new Date().toISOString(),
  };

  return renderTemplate(GENERATE_CHART_CONFIG_TEMPLATE, context);
};
