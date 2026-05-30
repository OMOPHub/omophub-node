import type { ConceptRelationship } from '../../concepts/interfaces/concept.js';

/**
 * Per-concept relationship entry. Aliased from `ConceptRelationship`
 * (defined in concepts/interfaces/) so users reading relationship code
 * see the canonical name and the two stay in sync.
 */
export type Relationship = ConceptRelationship;

/**
 * Metadata about a relationship type from `GET /relationships/types`.
 */
export interface RelationshipType {
  relationship_id: string;
  relationship_name: string;
  is_hierarchical: boolean;
  is_defining: boolean;
  is_symmetric: boolean;
  is_transitive: boolean;
  reverse_relationship_id?: string;
  primary_vocabularies?: string[];
  defines_ancestry?: boolean;
}

export interface RelationshipsResult {
  relationships: Relationship[];
}

export interface RelationshipTypesResult {
  relationship_types: RelationshipType[];
}
