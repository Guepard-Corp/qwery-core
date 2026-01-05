import type { ChartType } from '../types/chart.types';
import {
  getChartGenerationPrompt,
  getChartDefinition,
  getAxesLabelsPrecisionGuidelines,
} from '../config/supported-charts';
import type { BusinessContext } from '../../tools/types/business-context.types';

export const GENERATE_CHART_CONFIG_PROMPT = (
  chartType: ChartType,
  queryResults: {
    rows: Array<Record<string, unknown>>;
    columns: string[];
  },
  sqlQuery: string,
  businessContext?: BusinessContext | null,
) => {
  const chartDef = getChartDefinition(chartType);
  if (!chartDef) {
    throw new Error(`Unsupported chart type: ${chartType}`);
  }

  return `You are a Chart Configuration Generator. Your task is to transform SQL query results into a chart configuration JSON that can be rendered by React/Recharts components.

Selected Chart Type: **${chartType}**

Chart Type Requirements:
${chartDef.dataFormat.description}
Data format structure: ${JSON.stringify(chartDef.dataFormat.example, null, 2)}

SQL Query: ${sqlQuery}

Query Results:
- Columns: ${JSON.stringify(queryResults.columns)}
- Total rows: ${queryResults.rows.length}
- Sample data (first 3 rows for type inference only): ${JSON.stringify(queryResults.rows.slice(0, 3), null, 2)}
- **IMPORTANT**: You have access to the FULL query results via the queryResults parameter. Use the sample above only for understanding data types and structure. Transform ALL rows from the full queryResults.rows array into chart data format.

Chart Configuration Guidelines:

**Generic Structure (applies to all chart types):**
- chartType: "${chartType}"
- title: Optional descriptive title for the chart (e.g., "Students per Major", "Sales Trends Over Time")
  - Should be concise (3-8 words)
  - Should clearly describe what the chart shows
  - Use Title Case
- data: Array of objects transformed from query results
- config: Configuration object with colors, labels, and chart-specific keys

${getChartGenerationPrompt(chartType)}

**Data Transformation:**
1. Map SQL result columns to chart data keys
2. Transform rows into chart data format
3. Ensure numeric values are properly typed
4. Handle null/undefined values appropriately

**Configuration (Concise):**
- colors: Use actual hex color values (e.g., ["#8884d8", "#82ca9d", "#ffc658", "#ff7c7c", "#8dd1e1"])
  - DO NOT use CSS variables like "hsl(var(--chart-1))" as Recharts SVG doesn't support them
  - Use hex colors like "#8884d8" or rgb colors like "rgb(136, 132, 216)"
  - Provide an array of 3-5 colors for variety
- labels: Map column names to human-readable labels (REQUIRED - see precision guidelines below)
  ${
    businessContext &&
    businessContext.vocabulary &&
    businessContext.vocabulary.size > 0
      ? `- Use business context vocabulary to improve labels:
  * Domain: ${businessContext.domain.domain}
  * Vocabulary mappings (technical column → business term):
    ${Array.from(businessContext.vocabulary.entries())
      .map(
        ([_term, entry]) =>
          `  - "${entry.businessTerm}" → [${entry.technicalTerms.join(', ')}]${entry.synonyms.length > 0 ? ` (synonyms: ${entry.synonyms.join(', ')})` : ''}`,
      )
      .join('\n    ')}
  * When creating labels, check if a column name matches any technical term in the vocabulary
  * If found, use the business term as the label (e.g., if column is "user_id" and vocabulary maps "user" → "Customer", use "Customer" as the label)
  * Example: Column "user_id" → Look up "user" in vocabulary → Find "Customer" → Use "Customer" as label`
      : businessContext
        ? `- Use business context to improve labels:
  * Domain: ${businessContext.domain.domain}
  * Use domain understanding to create meaningful labels`
        : ''
  }
- Include chart-specific keys: ${chartDef.requirements.requiredKeys.join(', ')}
${
  businessContext
    ? `
**Business Context:**
- Domain: ${businessContext.domain.domain}
- Key entities: ${Array.from(businessContext.entities.values())
        .map((e) => e.name)
        .join(', ')}
- Use vocabulary mappings to translate technical column names to business-friendly labels
- Use domain understanding to create meaningful chart titles`
    : ''
}

${getAxesLabelsPrecisionGuidelines()}

Output Format (strict JSON):
{
  "chartType": "${chartType}",
  "title"?: string,
  "data": Array<Record<string, unknown>>,
  "config": {
    "colors": string[],
    "labels"?: Record<string, string>,
    ${chartDef.requirements.requiredKeys
      .map((key) => `"${key}": string`)
      .join(',\n    ')}
  }
}

**IMPORTANT**: Transform ALL query results rows into chart data format. Use sample data for type inference.

**CRITICAL - Date Handling**: If date fields are empty objects ({}), DuckDB date serialization failed. You MUST:
1. Use SQL query context to determine expected date (e.g., date_trunc('week', opened_at) → date)
2. Transform empty objects to date strings/timestamps
3. If date cannot be determined, use sequential index as temporary x-axis value

Current date: ${new Date().toISOString()}
Version: 1.0.0
`;
};
