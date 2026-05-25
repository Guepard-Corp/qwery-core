import type { DatasourceMetadata } from '../datasource-meta/metadata.type';

/**
 * Ontology port — the agent-facing contract for the optional semantic layer.
 *
 * The semantic layer derives a lightweight ontology from a datasource's
 * metadata (BootOX §4.2 direct-mapping) and exposes two read paths the agent
 * uses per turn:
 *
 *   - {@link OntologyProvider.getConcepts} maps business-language query terms to
 *     concrete `schema.table.column` entities (synonym bridging).
 *   - {@link OntologyProvider.getConstraints} snapshots OBQC §3 constraint rules
 *     for pre-execution SQL validation.
 *
 * Both methods are pure and synchronous: no embeddings, no network, no server.
 * The default wiring is {@link NullOntologyProvider}, so when the semantic layer
 * is disabled the agent behaves exactly as before — every method is a no-op.
 */
export interface OntologyProvider {
  /**
   * Per-query concept matches, ranked by lexical confidence (Jaccard ∪ I-SUB).
   * Returns at most `maxResults` matches; an empty array means "no signal —
   * the caller's existing schema output stands".
   */
  getConcepts(metadata: DatasourceMetadata, query: string, maxResults?: number): ConceptMatch[];

  /** OBQC constraint-rule snapshot derived from PK/FK/NOT-NULL metadata. */
  getConstraints(metadata: DatasourceMetadata): OBQCRule[];
}

/**
 * Query-aware schema retrieval port. Embeds a datasource's columns and returns
 * only the ones relevant to a query (plus their table-mates), so the agent gets
 * a focused schema instead of the full catalog. Backed by an embedding capability
 * in the adapter; the agent depends only on this contract.
 */
export interface SchemaRetriever {
  retrieve(
    metadata: DatasourceMetadata,
    query: string,
    options?: { topK?: number },
  ): Promise<RetrievedTable[]>;
}

/** A column selected by retrieval, with its query relevance. */
export interface RetrievedColumn {
  schema: string;
  table: string;
  column: string;
  dataType: string;
  comment?: string;
  /** Cosine similarity of this column's vector to the query. */
  score: number;
  /** True if this column was a top-k hit; false if pulled in as a table-mate. */
  directMatch: boolean;
}

/** A table grouping the retrieved columns that belong to it. */
export interface RetrievedTable {
  schema: string;
  table: string;
  columns: RetrievedColumn[];
  /** Best column score in this table (used to order tables). */
  maxScore: number;
}

/** A business-term → schema-entity match produced by ontology concept extraction. */
export interface ConceptMatch {
  /** The query token that triggered the match (the "business" surface form). */
  businessTerm: string;
  /** Fully-qualified physical entity: `schema.table.column`. */
  schemaEntity: string;
  /** Short human-readable description (column comment or a synthesized fallback). */
  description: string;
  /** Lexical confidence in [0, 1] (max of Jaccard overlap and I-SUB similarity). */
  confidence: number;
}

/** The OBQC §3 rule types this layer can derive from a direct-mapping T-box. */
export type OBQCRuleType = 'domain' | 'range' | 'domain_range' | 'incorrect_property';

/**
 * One OBQC validation rule. `constraint` carries the paper-verbatim natural-
 * language explanation the validation loop feeds to the LLM repair prompt —
 * keep its wording stable, as re-summarizing weakens the repair signal.
 */
export interface OBQCRule {
  ruleType: OBQCRuleType;
  subjectTable: string;
  subjectColumn?: string;
  propertyIri: string;
  constraint: string;
  objectTable?: string;
  objectColumn?: string;
  /** 1.0 for FKs declared by the driver; 0.7 for heuristically-detected FKs. */
  confidence: number;
}

/**
 * Inert default implementation. Returns no concepts and no constraints, so the
 * agent's behavior is byte-identical to having no semantic layer at all.
 */
export const NullOntologyProvider: OntologyProvider = {
  getConcepts: () => [],
  getConstraints: () => [],
};
