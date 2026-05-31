/**
 * OMOP concept payload shapes. Field names are snake_case to match the
 * wire format exactly — no client-side translation on response bodies.
 *
 * Shapes are derived from live-API inspection during the e2e validation
 * pass; nested fields like `relationships` and `hierarchy` only appear
 * when the matching `include_*` flag is set on the request.
 */

export interface Synonym {
  concept_synonym_name: string;
  language_concept_id?: number;
}

export interface ConceptSummary {
  concept_id: number;
  concept_name: string;
  vocabulary_id: string;
  concept_code: string;
}

/**
 * Full relationship row returned by the dedicated relationships
 * endpoints (`GET /concepts/{id}/relationships`, `relationships.get(id)`,
 * `concepts.relationships(id)`). Carries the target concept's full metadata.
 */
export interface ConceptRelationship {
  relationship_id: string;
  relationship_name?: string;
  direction?: 'forward' | 'reverse';
  target_concept_id: number;
  target_concept_name: string;
  target_vocabulary_id: string;
  target_concept_code: string;
  target_domain_id?: string;
  target_concept_class_id?: string;
  target_standard_concept?: 'S' | 'C' | 'N' | null;
  invalid_reason?: string | null;
}

/**
 * Compact relationship row attached to `Concept.relationships.parents`
 * and `.children` when `concepts.get(id, { includeRelationships: true })`
 * is called. Simpler than `ConceptRelationship` — only carries the
 * target concept ID, name, and relationship type.
 */
export interface ConceptRelationshipNode {
  concept_id: number;
  concept_name: string;
  relationship_id: string;
}

export interface ConceptHierarchyNode {
  concept_id: number;
  concept_name: string;
  vocabulary_id: string;
  concept_code: string;
  domain_id?: string;
  concept_class_id?: string;
  standard_concept?: 'S' | 'C' | 'N' | null;
  level?: number;
  min_levels_of_separation?: number;
  max_levels_of_separation?: number;
}

export interface Concept extends ConceptSummary {
  domain_id: string;
  concept_class_id: string;
  standard_concept: 'S' | 'C' | 'N' | null;
  valid_start_date: string;
  valid_end_date: string;
  invalid_reason?: string | null;
  /** Server-flagged boolean equivalent to `invalid_reason === null`. */
  is_valid?: boolean;
  /** Server-flagged boolean equivalent to `standard_concept === 'S'`. */
  is_standard?: boolean;
  /** Server-flagged boolean equivalent to `standard_concept === 'C'`. */
  is_classification?: boolean;
  synonyms?: Synonym[];
  /**
   * Populated when `includeRelationships: true`. The server returns a
   * `{ parents, children }` shape — NOT a flat `ConceptRelationship[]`.
   * Use `relationships.get(conceptId)` for the richer paginated view.
   */
  relationships?: {
    parents?: ConceptRelationshipNode[];
    children?: ConceptRelationshipNode[];
  };
  hierarchy?: {
    ancestors?: ConceptHierarchyNode[];
    descendants?: ConceptHierarchyNode[];
  };
}

/**
 * `concepts.related(id)` result row. Each item is a related concept
 * with relationship metadata (`relationship_id`, `relationship_score`,
 * `relationship_distance`).
 */
export interface RelatedConcept extends ConceptSummary {
  vocabulary_name?: string;
  domain_id?: string;
  concept_class_id?: string;
  standard_concept?: 'S' | 'C' | 'N' | null;
  relationship_id: string;
  relationship_name?: string;
  relationship_score?: number;
  relationship_distance?: number;
}

export interface BatchConceptResult {
  concepts: Concept[];
  failed_concepts?: { concept_id: number; reason?: string }[];
  summary?: {
    total?: number;
    found?: number;
    failed?: number;
  };
}

export interface ConceptSuggestion {
  suggestion: string;
  type: string;
  match_type: string;
  match_score: number;
  concept_id: number;
  vocabulary_id: string;
}

/**
 * `concepts.related` returns a bare array of related concepts.
 * Aliased as a type so the resource method's return looks named.
 */
export type RelatedConceptsResult = RelatedConcept[];

export interface ConceptRelationshipsResult {
  relationships: ConceptRelationship[];
}

/**
 * Single entry in a `concepts.recommended` result group.
 */
export interface RecommendedConceptEntry extends ConceptSummary {
  domain_id?: string;
  concept_class_id?: string;
  standard_concept?: 'S' | 'C' | 'N' | null;
  invalid_reason?: string | null;
  valid_start_date?: string;
  valid_end_date?: string;
  relationship_id?: string;
}

/**
 * `concepts.recommended` groups its output **keyed by source concept ID**
 * (as a string, per the JSON shape). Iterate via `Object.entries(data)`.
 *
 * ```ts
 * const { data } = await client.concepts.recommended({ conceptIds: [201826] });
 * for (const [sourceId, entries] of Object.entries(data ?? {})) {
 *   console.log(`Recommendations for ${sourceId}:`, entries);
 * }
 * ```
 */
export type RecommendedConceptsResult = Record<string, RecommendedConceptEntry[]>;
