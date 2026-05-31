/**
 * FHIR `Coding` shape, structurally compatible with the FHIR JSON spec
 * (camelCase). The SDK converts to snake_case (`user_selected`,
 * `vocabulary_id`) at the wire boundary via `toSnakeCaseKeys`.
 */
export interface Coding {
  system?: string;
  code?: string;
  display?: string;
  /** Whether this coding was explicitly chosen by the user (FHIR spec). */
  userSelected?: boolean;
  /** OMOPHub extension — pin the OMOP vocabulary_id rather than letting
   *  the API infer it from `system`. */
  vocabularyId?: string;
}

export interface CodeableConcept {
  coding?: Coding[];
  text?: string;
}

/**
 * One row of the OMOP concept table as returned by the FHIR resolver.
 * Snake_case to match the wire.
 */
export interface ResolvedConcept {
  concept_id: number;
  concept_name: string;
  vocabulary_id: string;
  concept_code: string;
  domain_id?: string;
  concept_class_id?: string;
  standard_concept?: 'S' | 'C' | 'N' | null;
}

export interface RecommendedConceptOutput extends ResolvedConcept {
  similarity_score?: number;
  relationship_type?: string;
}

export interface FhirResolution {
  source_concept: ResolvedConcept;
  standard_concept: ResolvedConcept;
  value_as_concept?: ResolvedConcept;
  value_target_field?: string;
  mapping_type: string;
  target_table: string;
  domain_resource_alignment?: string;
  similarity_score?: number;
  /** Quality bucket: typically `'high'`, `'medium'`, `'low'`, or `'manual_review'`. */
  mapping_quality?: string;
  quality_note?: string;
  alternative_standard_concepts?: ResolvedConcept[];
  recommendations?: RecommendedConceptOutput[];
  concept_map_id?: string;
  mapping_note?: string;
}

export interface FhirResolveResult {
  input: Record<string, unknown>;
  resolution: FhirResolution;
}

export interface FhirBatchSummary {
  total: number;
  resolved: number;
  failed: number;
}

export interface FhirBatchResult {
  results: FhirResolveResult[];
  summary: FhirBatchSummary;
}

export interface FhirCodeableConceptResult {
  input: Record<string, unknown>;
  /**
   * The best-matching coding resolved to a standard concept. Wrapped as
   * `{ input, resolution }` — the same shape `fhir.resolve()` returns —
   * because the server reports both the original coding and the resolution
   * details per-pick.
   */
  best_match?: FhirResolveResult;
  alternatives: FhirResolveResult[];
  unresolved: Record<string, unknown>[];
}
