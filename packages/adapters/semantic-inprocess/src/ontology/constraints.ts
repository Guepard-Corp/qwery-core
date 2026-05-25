import type { OBQCRule } from '@qwery/domain';
import type { OntologySchema } from './model';
import { dataPropertyIri, objectPropertyIri, toPascal, xsdFor } from './tokens';

/** Confidence assigned to FKs inferred heuristically (vs. 1.0 for declared FKs). */
export const HEURISTIC_FK_CONFIDENCE = 0.7;
export const AXIOM_FK_CONFIDENCE = 1.0;

interface HeuristicFk {
  schema: string;
  table: string;
  column: string;
  confidence: number;
}

function columnKey(schema: string, table: string, column: string): string {
  return `${schema} ${table} ${column}`;
}

/**
 * BootOX heuristic FK detector. Maps `<other>_id` / `<other>id` columns to the
 * PK of the matching table when the driver did not already declare an FK.
 * Returns only NEW detections — declared FKs take precedence and are skipped.
 */
export function detectHeuristicFks(schema: OntologySchema): Map<string, HeuristicFk> {
  const tableByPascal = new Map<string, OntologySchema[number]>();
  for (const table of schema) {
    tableByPascal.set(toPascal(table.table), table);
  }

  const out = new Map<string, HeuristicFk>();
  for (const table of schema) {
    for (const col of table.columns) {
      if (col.foreignKeyTarget) {
        continue;
      }
      const nameLower = col.column.toLowerCase();
      let candidate: string | undefined;
      if (nameLower.endsWith('_id')) {
        candidate = nameLower.slice(0, -3);
      } else if (nameLower.endsWith('id') && nameLower.length > 2) {
        candidate = nameLower.slice(0, -2);
      }
      if (!candidate) {
        continue;
      }
      const target = tableByPascal.get(toPascal(candidate));
      if (target === undefined || target === table) {
        continue;
      }
      const pk = target.columns.find((c) => c.isPrimaryKey);
      if (!pk) {
        continue;
      }
      out.set(columnKey(col.schema, col.table, col.column), {
        schema: target.schema,
        table: target.table,
        column: pk.column,
        confidence: HEURISTIC_FK_CONFIDENCE,
      });
    }
  }
  return out;
}

/**
 * Extract OBQC constraint rules from the schema's direct-mapping T-box. Emits
 * `domain` / `range` / `domain_range` rules for FK columns (ObjectProperties)
 * and `domain` / `range` rules for plain columns (DataProperties). The
 * `constraint` strings are the paper-verbatim NL explanations the validation
 * loop feeds to the LLM repair prompt.
 */
export function extractConstraints(schema: OntologySchema): OBQCRule[] {
  const rules: OBQCRule[] = [];
  const heuristicFks = detectHeuristicFks(schema);

  for (const table of schema) {
    const classLocal = toPascal(table.table);
    for (const col of table.columns) {
      const heuristic = heuristicFks.get(columnKey(col.schema, col.table, col.column));
      let fkTarget = col.foreignKeyTarget;
      if (!fkTarget && heuristic) {
        fkTarget = `${heuristic.schema}.${heuristic.table}.${heuristic.column}`;
      }

      if (fkTarget) {
        const opIri = objectPropertyIri(col.column);
        const parts = fkTarget.split('.');
        const targetTable = parts[1] ?? '';
        const targetColumn = parts.slice(2).join('.');
        const targetLocal = toPascal(targetTable);
        const confidence = heuristic && !col.foreignKeyTarget ? HEURISTIC_FK_CONFIDENCE : AXIOM_FK_CONFIDENCE;

        rules.push({
          ruleType: 'domain',
          subjectTable: table.table,
          subjectColumn: col.column,
          propertyIri: opIri,
          constraint: `The property ${opIri} has domain ex:${classLocal}, so its subject must be a ex:${classLocal}.`,
          confidence,
        });
        rules.push({
          ruleType: 'range',
          subjectTable: table.table,
          subjectColumn: col.column,
          propertyIri: opIri,
          constraint: `The property ${opIri} has range ex:${targetLocal}, so its object must be a ex:${targetLocal}.`,
          objectTable: targetTable,
          objectColumn: targetColumn,
          confidence,
        });
        rules.push({
          ruleType: 'domain_range',
          subjectTable: table.table,
          subjectColumn: col.column,
          propertyIri: opIri,
          constraint: `Joining ${table.table}.${col.column} to ${targetTable}.${targetColumn} is valid only because the range of ${opIri} matches the domain of the next hop.`,
          objectTable: targetTable,
          objectColumn: targetColumn,
          confidence,
        });
      } else {
        const dpIri = dataPropertyIri(col.column);
        rules.push({
          ruleType: 'domain',
          subjectTable: table.table,
          subjectColumn: col.column,
          propertyIri: dpIri,
          constraint: `The data property ${dpIri} has domain ex:${classLocal}, so its subject must be a ex:${classLocal}.`,
          confidence: AXIOM_FK_CONFIDENCE,
        });
        const xsd = xsdFor(col.dataType);
        rules.push({
          ruleType: 'range',
          subjectTable: table.table,
          subjectColumn: col.column,
          propertyIri: dpIri,
          constraint: `The data property ${dpIri} has range ${xsd}, so its object must be a ${xsd} literal.`,
          confidence: AXIOM_FK_CONFIDENCE,
        });
      }
    }
  }

  return rules;
}
