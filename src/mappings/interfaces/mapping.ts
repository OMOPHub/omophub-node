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
 * Minimum live-API shape: `{ source_concept_id, source_concept_name,
 * target_concept_id, target_concept_name, relationship_id }`. The
 * remaining `source_*` / `target_*` metadata fields and `confidence`
 * are populated when the server has them expanded (e.g. when
 * `targetVocabulary` was supplied or the row carries a mapping score).
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
  total_source_concepts?: number;
  total_mappings?: number;
  mapped_concepts?: number;
  unmapped_concepts?: number;
}

export interface MappingsListResult {
  mappings: Mapping[];
  summary?: MappingsSummary;
}

/**
 * Failed-mapping entry in `MapConceptsResult.failed_mappings`. Discriminated
 * by which input variant the failure traces back to — every failed mapping
 * carries either a `source_concept_id` (from the `sourceConcepts` input) or
 * a `source_code` (from the `sourceCodes` input), never an empty object.
 * `reason` is optional, mirroring `BatchConceptResult.failed_concepts` in
 * `concepts/interfaces/`.
 */
export type FailedMapping =
  | { source_concept_id: number; source_code?: never; reason?: string }
  | {
      source_concept_id?: never;
      source_code: { vocabulary_id: string; concept_code: string };
      reason?: string;
    };

export interface MapConceptsResult {
  mappings: Mapping[];
  failed_mappings?: FailedMapping[];
  summary?: MappingsSummary;
}

/**
 * Reference to a non-standard concept by its vocabulary code, used as
 * input to `mappings.map({ sourceCodes: [...] })`.
 */
export interface SourceCodeRef {
  vocabulary_id: string;
  concept_code: string;
}
