/**
 * OMOP vocabulary metadata. Snake_case keys match the wire payload —
 * no translation applied to responses.
 */
export interface Vocabulary {
  vocabulary_id: string;
  vocabulary_name: string;
  vocabulary_concept_id?: number;
  vocabulary_reference?: string;
  vocabulary_version?: string;
}

export interface VocabularyStats {
  vocabulary_id: string;
  vocabulary_name: string;
  total_concepts: number;
  standard_concepts?: number;
  classification_concepts?: number;
  invalid_concepts?: number;
  active_concepts?: number;
  valid_start_date?: string;
  valid_end_date?: string;
  last_updated?: string;
}

export interface VocabularySummary extends Vocabulary {
  stats?: VocabularyStats;
}

/**
 * Domain entry returned by `GET /vocabularies/domains`. Distinct from
 * the richer `Domain` type returned by `GET /domains` — this one is
 * scoped to the vocabulary catalog.
 */
export interface VocabularyDomain {
  domain_id: string;
  domain_name: string;
  domain_concept_id?: number;
}

/**
 * Concept-class entry returned by `GET /vocabularies/concept-classes`.
 */
export interface ConceptClass {
  concept_class_id: string;
  concept_class_name: string;
  concept_class_concept_id?: number;
}

/**
 * `GET /vocabularies` returns a named-wrapper object with the array under
 * `vocabularies` (NOT a bare array, NOT a generic `data` envelope).
 * Pagination metadata lives on the outer `Response.meta.pagination`.
 *
 * Items are typed as `VocabularySummary` (= `Vocabulary` + optional `stats`)
 * so callers passing `includeStats: true` can access the populated `stats`
 * field without casting. `stats` is undefined when `includeStats` is false.
 */
export interface ListVocabulariesResult {
  vocabularies: VocabularySummary[];
}

/**
 * `GET /vocabularies/{id}/concepts` returns a **bare array** of full
 * `Concept` rows. Pagination metadata lives on the outer `Response.meta`.
 */
export type VocabularyConceptsResult = import('../../concepts/interfaces/concept.js').Concept[];

export interface ListVocabularyDomainsResult {
  domains: VocabularyDomain[];
}

/**
 * `GET /vocabularies/concept-classes` returns a **bare array** of
 * concept-class rows.
 */
export type ListConceptClassesResult = ConceptClass[];
