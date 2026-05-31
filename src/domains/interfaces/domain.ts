export interface DomainStats {
  total_concepts: number;
  standard_concepts?: number;
  classification_concepts?: number;
  vocabulary_distribution?: Record<string, number>;
  concept_class_distribution?: Record<string, number>;
  growth_trend?: Record<string, unknown>;
  usage_frequency?: number;
  relationship_density?: number;
}

export interface DomainSummary {
  domain_id: string;
  domain_name: string;
  domain_concept_id?: number;
}

export interface Domain extends DomainSummary {
  stats?: DomainStats;
  category?: string;
  description?: string;
}

/**
 * `GET /domains` returns the catalog wrapped under `domains` (not a bare
 * array). The endpoint is not paginated server-side.
 */
export interface ListDomainsResult {
  domains: Domain[];
}

/**
 * `GET /domains/{id}/concepts` — concepts wrapped under `concepts`,
 * pagination on outer `Response.meta`.
 */
export interface DomainConceptsResult {
  concepts: import('../../concepts/interfaces/concept.js').ConceptSummary[];
}
