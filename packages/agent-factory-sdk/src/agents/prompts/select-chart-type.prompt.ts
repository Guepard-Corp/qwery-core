import {
  getChartSelectionPrompts,
  getChartsInfoForPrompt,
  getChartTypesUnionString,
} from '../config/supported-charts';

export const SELECT_CHART_TYPE_PROMPT = (
  userInput: string,
  sqlQuery: string,
  queryResults: {
    rows: Array<Record<string, unknown>>;
    columns: string[];
  },
  businessContext?: {
    domain: string;
    entities: Array<{ name: string; columns: string[] }>;
    relationships: Array<{ from: string; to: string; join: string }>;
    vocabulary?: Array<{
      businessTerm: string;
      technicalTerms: string[];
      synonyms: string[];
    }>;
  } | null,
) => `You are a Chart Type Selection Agent. Your task is to analyze the user's request, SQL query, and query results to determine the best chart type for visualization.

${getChartsInfoForPrompt()}

Available chart types:
${getChartSelectionPrompts()}

Analysis Guidelines:
- Consider the user's explicit request (if they mentioned a specific chart type)
- Analyze the SQL query structure (aggregations, GROUP BY, time functions)
- Examine the query results structure (columns, data types, row count)
- Look for time/date columns → suggests line chart
- Look for categorical groupings → suggests bar chart
- Look for proportions/percentages → suggests pie chart
- Use the chart type descriptions above to match the data characteristics
${
  businessContext
    ? `- Use business context to understand data semantics:
  * Domain: ${businessContext.domain}
  * Key entities: ${businessContext.entities.map((e) => e.name).join(', ')}
  * Use entity relationships to understand data connections
  * If query involves time-based entities or temporal relationships → prefer line chart
  * If query involves categorical entities or comparisons → prefer bar chart
  * If query involves proportions or parts of a whole → prefer pie chart
  ${
    businessContext.vocabulary && businessContext.vocabulary.length > 0
      ? `* Vocabulary mappings (use to understand column meanings):
    ${businessContext.vocabulary.map((v) => `  - "${v.businessTerm}" → [${v.technicalTerms.join(', ')}]${v.synonyms.length > 0 ? ` (synonyms: ${v.synonyms.join(', ')})` : ''}`).join('\n    ')}`
      : ''
  }`
    : ''
}

User Input: ${userInput}

SQL Query: ${sqlQuery}

Query Results:
- Columns: ${JSON.stringify(queryResults.columns)}
- Total rows: ${queryResults.rows.length}
- Sample data (first 3 rows for structure analysis only): ${JSON.stringify(queryResults.rows.slice(0, 3), null, 2)}
- Note: Full data is available but not included here to reduce token usage. Use the sample data to understand structure and types.

**IMPORTANT**: Use the actual SQL query, user input, and query results data provided above to make your selection. Do not say "No SQL query or result data was provided" - the data is provided above.

Based on this analysis, select the most appropriate chart type and provide reasoning.

Output Format:
{
  "chartType": ${getChartTypesUnionString()},
  "reasoning": "string explaining why this chart type was selected"
}

Current date: ${new Date().toISOString()}
Version: 1.0.0
`;
