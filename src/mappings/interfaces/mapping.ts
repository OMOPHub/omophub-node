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

export interface Mapping {
  source_concept_id: number;
  source_concept_name: string;
  source_vocabulary_id: string;
  source_concept_code: string;
  target_concept_id: number;
  target_concept_name: string;
  target_vocabulary_id: string;
  target_concept_code: string;
  target_domain_id?: string;
  target_concept_class_id?: string;
  mapping_type: string;
  relationship_id?: string;
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

export interface FailedMapping {
  source_concept_id?: number;
  source_code?: { vocabulary_id: string; concept_code: string };
  reason?: string;
}

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
