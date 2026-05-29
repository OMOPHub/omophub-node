import { describe, expect, test } from 'vitest';
import { camelToSnakeCase, toSnakeCaseKeys } from '../../../src/common/utils/to-snake-case.js';

describe('camelToSnakeCase', () => {
  test('converts camelCase to snake_case', () => {
    expect(camelToSnakeCase('conceptId')).toBe('concept_id');
    expect(camelToSnakeCase('vocabularyIds')).toBe('vocabulary_ids');
    expect(camelToSnakeCase('includeRelationships')).toBe('include_relationships');
  });

  test('leaves snake_case unchanged', () => {
    expect(camelToSnakeCase('already_snake')).toBe('already_snake');
  });

  test('handles single-word identifiers', () => {
    expect(camelToSnakeCase('page')).toBe('page');
  });

  test('treats consecutive uppercase as a single acronym', () => {
    expect(camelToSnakeCase('FHIRResource')).toBe('fhir_resource');
    expect(camelToSnakeCase('XMLHttpRequest')).toBe('xml_http_request');
  });

  test('preserves trailing uppercase runs', () => {
    expect(camelToSnakeCase('userID')).toBe('user_id');
    expect(camelToSnakeCase('exportPDF')).toBe('export_pdf');
  });

  test('splits a lone leading uppercase from the next word (lodash-compatible)', () => {
    expect(camelToSnakeCase('OAuthToken')).toBe('o_auth_token');
  });
});

describe('toSnakeCaseKeys', () => {
  test('converts object keys recursively', () => {
    const input = {
      conceptId: 1,
      includeRelationships: true,
      nested: { sourceCodes: ['SNOMED:123'] },
    };
    expect(toSnakeCaseKeys(input)).toEqual({
      concept_id: 1,
      include_relationships: true,
      nested: { source_codes: ['SNOMED:123'] },
    });
  });

  test('passes primitives through', () => {
    expect(toSnakeCaseKeys(42)).toBe(42);
    expect(toSnakeCaseKeys('hi')).toBe('hi');
    expect(toSnakeCaseKeys(null)).toBeNull();
    expect(toSnakeCaseKeys(undefined)).toBeUndefined();
  });

  test('walks arrays of objects', () => {
    const input = [{ conceptId: 1 }, { conceptId: 2 }];
    expect(toSnakeCaseKeys(input)).toEqual([{ concept_id: 1 }, { concept_id: 2 }]);
  });
});
