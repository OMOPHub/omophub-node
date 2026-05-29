import { describe, expect, test } from 'vitest';
import { appendQuery, buildQuery } from '../../../src/common/utils/build-query.js';

describe('buildQuery', () => {
  test('returns empty string for undefined or empty input', () => {
    expect(buildQuery(undefined)).toBe('');
    expect(buildQuery({})).toBe('');
  });

  test('converts camelCase keys to snake_case', () => {
    expect(buildQuery({ pageSize: 50 })).toBe('page_size=50');
    expect(buildQuery({ includeRelationships: true })).toBe('include_relationships=true');
  });

  test('drops null and undefined values', () => {
    expect(buildQuery({ page: 1, foo: null, bar: undefined })).toBe('page=1');
  });

  test('joins arrays with commas', () => {
    expect(buildQuery({ vocabularyIds: ['SNOMED', 'ICD10'] })).toBe(
      'vocabulary_ids=SNOMED%2CICD10',
    );
  });

  test('drops empty arrays', () => {
    expect(buildQuery({ page: 1, vocabularyIds: [] })).toBe('page=1');
  });

  test('stringifies booleans and numbers', () => {
    expect(buildQuery({ page: 1, includeStats: false })).toBe('page=1&include_stats=false');
  });

  test('preserves multiple keys', () => {
    expect(buildQuery({ page: 1, pageSize: 50, includeStats: true })).toBe(
      'page=1&page_size=50&include_stats=true',
    );
  });
});

describe('appendQuery', () => {
  test('returns the path unchanged when query is empty', () => {
    expect(appendQuery('/concepts', '')).toBe('/concepts');
  });

  test('appends with ? when path has no query', () => {
    expect(appendQuery('/concepts', 'page=1')).toBe('/concepts?page=1');
  });

  test('appends with & when path already has a query', () => {
    expect(appendQuery('/concepts?foo=bar', 'page=1')).toBe('/concepts?foo=bar&page=1');
  });
});
