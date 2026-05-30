/**
 * OMOP concept payload shapes. Field names are snake_case to match the
 * wire format exactly — no client-side translation on response bodies.
 *
 * Shapes are derived from the Python SDK TypedDicts; nested fields like
 * `relationships` and `hierarchy` only appear when the matching `include_*`
 * flag is set on the request.
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

export interface ConceptHierarchyNode {
  concept_id: number;
  concept_name: string;
  vocabulary_id: string;
  concept_code: string;
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
  synonyms?: Synonym[];
  relationships?: ConceptRelationship[];
  hierarchy?: {
    ancestors?: ConceptHierarchyNode[];
    descendants?: ConceptHierarchyNode[];
  };
}

export interface RelatedConcept extends ConceptSummary {
  relatedness_score: number;
  relatedness_type: string;
  hierarchical_score?: number;
  semantic_score?: number;
  co_occurrence_score?: number;
  mapping_score?: number;
  explanation?: string;
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

export interface RelatedConceptsResult {
  related_concepts: RelatedConcept[];
}

export interface ConceptRelationshipsResult {
  relationships: ConceptRelationship[];
}

export interface ConceptRecommendation {
  source_concept_id: number;
  recommendations: RelatedConcept[];
}

export interface RecommendedConceptsResult {
  recommendations: ConceptRecommendation[];
}
