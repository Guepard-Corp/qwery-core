import { generateText } from 'ai';
import { resolveModel } from './model-resolver';
import type { SimpleSchema } from '@qwery/domain/entities';

const GENERATE_SHEET_NAME_PROMPT = (
  currentName: string,
  schema: SimpleSchema,
) => {
  const table = schema.tables[0];
  const columns = table?.columns
    .map(
      (col: { columnName: string; columnType: string }) =>
        `${col.columnName} (${col.columnType})`,
    )
    .join(', ');

  return `Based on the following Google Sheet schema, generate a better, more descriptive name for this sheet. The current name is "${currentName}".

Schema:
Columns: ${columns || 'No columns found'}

Requirements:
- Maximum 50 characters
- Use lowercase letters, numbers, and underscores only
- Be descriptive based on the column names and data structure
- Make it meaningful and easy to remember
- Avoid generic names like "sheet1", "data", or "my_sheet"
- If columns suggest a specific domain (e.g., "name", "email", "age" → "students" or "users"), use that
- Return ONLY the new name, nothing else

Generate the new sheet name:`;
};

export async function generateSheetName(
  currentName: string,
  schema: SimpleSchema,
): Promise<string> {
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () =>
          reject(new Error('Sheet name generation timeout after 10 seconds')),
        10000,
      );
    });

    const generatePromise = generateText({
      model: await resolveModel('llamacpp/llama-2-7b-chat'),
      prompt: GENERATE_SHEET_NAME_PROMPT(currentName, schema),
    });

    const result = await Promise.race([generatePromise, timeoutPromise]);
    let newName = result.text.trim();

    // Clean up and sanitize the name
    newName = newName
      .replace(/^["']|["']$/g, '') // Remove quotes
      .replace(/[^a-zA-Z0-9_]/g, '_') // Replace invalid chars with underscore
      .replace(/^([^a-zA-Z])/, 'v_$1') // Prefix with v_ if starts with number
      .toLowerCase()
      .slice(0, 50);

    return newName || currentName;
  } catch (error) {
    console.error('[generateSheetName] Error:', error);
    return currentName;
  }
}
