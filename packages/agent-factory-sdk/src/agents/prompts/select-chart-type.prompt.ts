import {
  getChartSelectionPrompts,
  getChartsInfoForPrompt,
  getChartTypesUnionString,
} from '../config/supported-charts';
import { renderTemplate } from './template-engine';

const SELECT_CHART_TYPE_TEMPLATE = `You are a Chart Type Selection Agent. Your task is to analyze the user's request, SQL query, and query results metadata to determine the best chart type for visualization.

{{chartsInfo}}

Available chart types:
{{selectionPrompts}}

Analysis Guidelines:
- Consider the user's explicit request (if they mentioned a specific chart type)
- Analyze the SQL query structure (aggregations, GROUP BY, time functions)
- Examine the query results structure (columns, data types, row count)
- Look for time/date columns → suggests line chart
- Look for categorical groupings → suggests bar chart
- Look for proportions/percentages → suggests pie chart
- Use the chart type descriptions above to match the data characteristics
{{#businessContext}}
- Use business context to understand data semantics:
  * Domain: {{domain}}
  * Key entities: {{entitiesList}}
  * Use entity relationships to understand data connections
  * If query involves time-based entities or temporal relationships → prefer line chart
  * If query involves categorical entities or comparisons → prefer bar chart
  * If query involves proportions or parts of a whole → prefer pie chart
  {{#hasVocabulary}}
* Vocabulary mappings (use to understand column meanings):
{{#vocabulary}}
  - "{{businessTerm}}" → [{{technicalTermsList}}]{{#hasSynonyms}} (synonyms: {{synonymsList}}){{/hasSynonyms}}
{{/vocabulary}}
  {{/hasVocabulary}}
{{/businessContext}}

User Input: {{userInput}}

SQL Query: {{sqlQuery}}

Query Results:
- Columns: {{columnsJson}}
- Total rows: {{rowCount}}
- Note: You only see column names and row counts, not full row-level data. Use this metadata to understand structure and types.

**IMPORTANT**: Use the actual SQL query, user input, and query results data provided above to make your selection. Do not say "No SQL query or result data was provided" - the data is provided above.

Based on this analysis, select the most appropriate chart type and provide reasoning.

Output Format:
{
  "chartType": {{chartTypesUnion}},
  "reasoning": "string explaining why this chart type was selected"
}

Current date: {{currentDate}}
Version: 1.0.0
`;

type BusinessContext = {
  domain: string;
  entities: Array<{ name: string; columns: string[] }>;
  relationships: Array<{ from: string; to: string; join: string }>;
  vocabulary?: Array<{
    businessTerm: string;
    technicalTerms: string[];
    synonyms: string[];
  }>;
};

export const SELECT_CHART_TYPE_PROMPT = (
  userInput: string,
  sqlQuery: string,
  metadata: {
    columns: string[];
    rowCount: number;
  },
  businessContext?: BusinessContext | null,
) => {
  const businessContextForTemplate =
    businessContext && businessContext.entities.length > 0
      ? {
          domain: businessContext.domain,
          entitiesList: businessContext.entities.map((e) => e.name).join(', '),
          hasVocabulary:
            !!businessContext.vocabulary &&
            businessContext.vocabulary.length > 0,
          vocabulary:
            businessContext.vocabulary?.map((entry) => ({
              businessTerm: entry.businessTerm,
              technicalTermsList: entry.technicalTerms.join(', '),
              synonymsList: entry.synonyms.join(', '),
              hasSynonyms: entry.synonyms.length > 0,
            })) ?? [],
        }
      : null;

  const context = {
    userInput,
    sqlQuery,
    chartsInfo: getChartsInfoForPrompt(),
    selectionPrompts: getChartSelectionPrompts(),
    chartTypesUnion: getChartTypesUnionString(),
    columnsJson: JSON.stringify(metadata.columns),
    rowCount: metadata.rowCount,
    businessContext: businessContextForTemplate,
    currentDate: new Date().toISOString(),
  };

  return renderTemplate(SELECT_CHART_TYPE_TEMPLATE, context);
};
