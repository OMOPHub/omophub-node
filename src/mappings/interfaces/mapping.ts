export interface MappingQuality {
  confidence_score: number;
  equivalence_type?: string;
  semantic_similarity?: number;
  mapping_source?: string;
  validation_status?: string;
  last_reviewed_date?: string;
}

export interface MappingContext {
  source_table?: string;
  target_table?: string;
  scope?: string;
}

/**
 * Single mapping row returned by `mappings.get` / `mappings.map`.
 *
 * The optional fields are optional because this type is shared by two
 * endpoints that populate different subsets — not because the server
 * decides case by case:
 *
 * - `mappings.get` (`GET /concepts/{id}/mappings`) returns exactly
 *   `{ source_concept_id, source_concept_name, target_concept_id,
 *   target_concept_name, relationship_id, confidence }`. Supplying
 *   `targetVocabulary` does NOT add the vocabulary/code fields —
 *   measured against production 2026-08-12. Resolve a target's
 *   vocabulary and code with `concepts.get(target_concept_id)`.
 * - `mappings.map` (`POST /concepts/map`) additionally returns
 *   `source_*` / `target_*` `vocabulary_id` and `concept_code`.
 */
export interface Mapping {
  source_concept_id: number;
  source_concept_name: string;
  source_vocabulary_id?: string;
  source_concept_code?: string;
  target_concept_id: number;
  target_concept_name: string;
  target_vocabulary_id?: string;
  target_concept_code?: string;
  target_domain_id?: string;
  target_concept_class_id?: string;
  relationship_id: string;
  /** Server-side mapping-quality score in `[0, 1]`. */
  confidence?: number;
  mapping_type?: string;
  invalid_reason?: string | null;
  quality?: MappingQuality;
  context?: MappingContext;
}

export interface MappingsSummary {
  requested_sources: number;
  mapped_sources: number;
  unmapped_sources: number;
  total_mappings: number;
}

export interface MappingsListResult {
  mappings: Mapping[];
}

export type UnmappedSourceReason = 'source_not_found' | 'no_mapping_found';

/** A submitted source that produced no mappings. */
export type UnmappedSource =
  | {
      source_concept_id: number;
      vocabulary_id?: never;
      concept_code?: never;
      reason: UnmappedSourceReason;
    }
  | {
      source_concept_id?: number;
      vocabulary_id: string;
      concept_code: string;
      reason: UnmappedSourceReason;
    };

export interface MapConceptsResult {
  mappings: Mapping[];
  unmapped_sources: UnmappedSource[];
  summary: MappingsSummary;
}

/**
 * Reference to a non-standard concept by its vocabulary code, used as
 * input to `mappings.map({ sourceCodes: [...] })`.
 */
export interface SourceCodeRef {
  vocabulary_id: string;
  concept_code: string;
}
