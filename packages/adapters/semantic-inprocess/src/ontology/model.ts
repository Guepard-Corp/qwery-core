/**
 * Internal, driver-agnostic ontology view of a datasource. Decouples the
 * concept/constraint extractors from the rich `DatasourceMetadata` shape:
 * `normalizeMetadata` folds the flat column list plus per-table PK/FK
 * information into this model once, and the extractors operate on it.
 */

export interface OntologyColumn {
  schema: string;
  table: string;
  column: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  /** `schema.table.column` of the referenced PK, when this column is an FK. */
  foreignKeyTarget?: string;
  comment?: string;
}

export interface OntologyTable {
  schema: string;
  table: string;
  columns: OntologyColumn[];
}

export type OntologySchema = OntologyTable[];
