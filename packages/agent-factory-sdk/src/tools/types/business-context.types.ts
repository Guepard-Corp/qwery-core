import type { SimpleSchema } from '@qwery/domain/entities';

// Enhanced interfaces with confidence scoring
export interface BusinessEntity {
  name: string; // business concept name (e.g., "User", "Order")
  columns: string[]; // columns that represent this entity
  views: string[]; // view names containing this entity
  dataType: string; // inferred data type
  businessType: 'entity' | 'relationship' | 'attribute'; // type of business concept
  confidence: number; // 0-1, confidence in entity extraction
}

export interface Relationship {
  fromView: string;
  toView: string;
  fromColumn: string;
  toColumn: string;
  joinColumn: string; // common column name (for backward compatibility)
  type: 'one-to-one' | 'one-to-many' | 'many-to-many' | 'unknown';
  direction: 'forward' | 'reverse' | 'bidirectional';
  confidence: number; // 0-1, how confident we are about this relationship
  joinCondition: string; // suggested JOIN condition
}

export interface VocabularyEntry {
  businessTerm: string;
  technicalTerms: string[]; // all columns that map to this term
  confidence: number;
  synonyms: string[];
}

export interface DataPatterns {
  enums: Map<string, string[]>; // column → possible values
  ranges: Map<string, { min: number; max: number; avg: number }>;
  patterns: Map<string, string>; // column → detected pattern
  uniqueness: string[]; // columns that appear unique
}

export interface ViewMetadata {
  viewName: string;
  schema: SimpleSchema;
  entities: string[]; // business entities found in this view
  lastAnalyzed: string;
  dataPatterns?: DataPatterns;
}

export interface DomainInference {
  domain: string;
  confidence: number;
  keywords: string[];
  alternativeDomains: Array<{ domain: string; confidence: number }>;
}

export interface BusinessContext {
  entities: Map<string, BusinessEntity>; // entity name → business entity
  vocabulary: Map<string, VocabularyEntry>; // business term → vocabulary entry
  relationships: Relationship[]; // detected relationships between views
  entityGraph: Map<string, string[]>; // entity → connected entities
  domain: DomainInference; // inferred business domain with confidence
  views: Map<string, ViewMetadata>; // view name → metadata
  updatedAt: string;
}
