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
