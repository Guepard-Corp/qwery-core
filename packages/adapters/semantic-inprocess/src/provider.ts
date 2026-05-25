import type { OntologyProvider } from '@qwery/domain';
import { extractConcepts } from './ontology/concepts';
import { extractConstraints } from './ontology/constraints';
import { normalizeMetadata } from './ontology/normalize';

/**
 * In-process implementation of the {@link OntologyProvider} port. Derives a
 * lightweight ontology from datasource metadata on every call — no embeddings,
 * no network, no server. Cheap enough to run per turn on typical schemas; add a
 * normalized-schema cache here if profiling shows it's needed.
 *
 * Returned as a plain object (mirroring `NullOntologyProvider`) so callers can
 * swap the two behind the port without caring whether it's a class.
 */
export function createInProcessOntologyProvider(): OntologyProvider {
  return {
    getConcepts: (metadata, query, maxResults) =>
      extractConcepts(normalizeMetadata(metadata), query, maxResults !== undefined ? { maxResults } : {}),
    getConstraints: (metadata) => extractConstraints(normalizeMetadata(metadata)),
  };
}
