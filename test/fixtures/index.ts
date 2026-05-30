import type { PaginationMeta } from '../../src/common/interfaces/pagination.js';
import type { Concept } from '../../src/concepts/interfaces/concept.js';
import type { Domain } from '../../src/domains/interfaces/domain.js';
import type { Vocabulary } from '../../src/vocabularies/interfaces/vocabulary.js';

export const DIABETES_CONCEPT_ID = 201826;
export const ASPIRIN_CONCEPT_ID = 1112807;
export const HYPERTENSION_CONCEPT_ID = 316866;
export const COVID_CONCEPT_ID = 37311061;
export const MOCK_API_KEY = 'oh_test_key_12345';

export const mockVocabulary = (overrides: Partial<Vocabulary> = {}): Vocabulary => ({
  vocabulary_id: 'SNOMED',
  vocabulary_name: 'SNOMED CT',
  vocabulary_concept_id: 44819097,
  vocabulary_reference: 'SNOMED CT International Edition',
  vocabulary_version: '2024-09-01',
  ...overrides,
});

export const mockPagination = (overrides: Partial<PaginationMeta> = {}): PaginationMeta => ({
  page: 1,
  page_size: 20,
  total_items: 1,
  total_pages: 1,
  has_next: false,
  has_previous: false,
  ...overrides,
});

export const mockApiEnvelope = <T>(data: T, meta: Record<string, unknown> = {}) => ({
  success: true as const,
  data,
  meta: {
    request_id: 'req_test_12345',
    timestamp: '2026-05-29T00:00:00Z',
    ...meta,
  },
});

export const mockApiErrorBody = (
  code: string,
  message: string,
  details?: Record<string, unknown>,
) => ({
  success: false as const,
  error: details ? { code, message, details } : { code, message },
});

export const mockConcept = (overrides: Partial<Concept> = {}): Concept => ({
  concept_id: DIABETES_CONCEPT_ID,
  concept_name: 'Type 2 diabetes mellitus',
  vocabulary_id: 'SNOMED',
  concept_code: '44054006',
  domain_id: 'Condition',
  concept_class_id: 'Clinical Finding',
  standard_concept: 'S',
  valid_start_date: '2002-01-31',
  valid_end_date: '2099-12-31',
  ...overrides,
});

export const mockDomain = (overrides: Partial<Domain> = {}): Domain => ({
  domain_id: 'Condition',
  domain_name: 'Condition',
  domain_concept_id: 19,
  ...overrides,
});
