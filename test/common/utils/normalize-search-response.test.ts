import { describe, expect, test } from 'vitest';
import {
  normaliseBasicSearchData,
  normaliseSemanticSearchData,
} from '../../../src/common/utils/normalize-search-response.js';

describe('normaliseBasicSearchData', () => {
  test('passes through modern { concepts, facets, search_metadata } shape', () => {
    const raw = {
      concepts: [{ concept_id: 1 }],
      facets: { vocabularies: [] },
      search_metadata: { query: 'diabetes' },
    };
    expect(normaliseBasicSearchData(raw)).toEqual(raw);
  });

  test('unwraps legacy { data: [...] } shape into concepts', () => {
    const raw = { data: [{ concept_id: 1 }, { concept_id: 2 }] };
    expect(normaliseBasicSearchData(raw)).toEqual({
      concepts: [{ concept_id: 1 }, { concept_id: 2 }],
    });
  });

  test('wraps a bare array into { concepts: [...] }', () => {
    expect(normaliseBasicSearchData([{ concept_id: 1 }])).toEqual({
      concepts: [{ concept_id: 1 }],
    });
  });

  test('returns empty concepts for null / non-object / no arrays present', () => {
    expect(normaliseBasicSearchData(null)).toEqual({ concepts: [] });
    expect(normaliseBasicSearchData('weird')).toEqual({ concepts: [] });
    expect(normaliseBasicSearchData({ unrelated: 1 })).toEqual({ concepts: [] });
  });
});

describe('normaliseSemanticSearchData', () => {
  test('extracts results array from { results: [...] } shape', () => {
    const raw = {
      results: [{ concept_id: 1, similarity_score: 0.9 }],
      search_metadata: {},
    };
    expect(normaliseSemanticSearchData(raw)).toEqual([{ concept_id: 1, similarity_score: 0.9 }]);
  });

  test('passes through a bare array', () => {
    const raw = [{ concept_id: 1, similarity_score: 0.9 }];
    expect(normaliseSemanticSearchData(raw)).toEqual(raw);
  });

  test('falls back to { data: [...] } if results missing', () => {
    const raw = { data: [{ concept_id: 1, similarity_score: 0.9 }] };
    expect(normaliseSemanticSearchData(raw)).toEqual([{ concept_id: 1, similarity_score: 0.9 }]);
  });

  test('returns empty array for null / non-object / no arrays present', () => {
    expect(normaliseSemanticSearchData(null)).toEqual([]);
    expect(normaliseSemanticSearchData({})).toEqual([]);
  });
});
