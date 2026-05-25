export type { EmbeddingBackend } from './embedding/backend';
export { createHashingEmbedder, type HashingEmbedderOptions } from './embedding/hashing';
export { cosineSimilarity, dot, l2Norm, l2Normalize } from './embedding/vector';
export { type ConceptOptions, extractConcepts } from './ontology/concepts';
export {
  AXIOM_FK_CONFIDENCE,
  detectHeuristicFks,
  extractConstraints,
  HEURISTIC_FK_CONFIDENCE,
} from './ontology/constraints';
export { ISUB_MIN_SUBSTR, isub, longestCommonSubstring } from './ontology/isub';
export type { OntologyColumn, OntologySchema, OntologyTable } from './ontology/model';
export { normalizeMetadata } from './ontology/normalize';
export {
  dataPropertyIri,
  objectPropertyIri,
  splitIdentifier,
  toCamel,
  tokenizeQuery,
  toPascal,
  xsdFor,
} from './ontology/tokens';
export { createInProcessOntologyProvider } from './provider';
export { buildColumnEmbeddingText } from './retrieval/embedding-text';
export {
  createInProcessSchemaRetriever,
  type SchemaRetrieverOptions,
  schemaSignature,
} from './retrieval/provider';
export { type RetrieveOptions, retrieve, retrieveColumns } from './retrieval/retrieve';
export {
  buildSchemaIndex,
  type ColumnVector,
  type SchemaIndex,
} from './retrieval/schema-index';
