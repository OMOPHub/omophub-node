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

  test('preserves Date instances rather than collapsing them to {}', () => {
    const d = new Date('2026-05-29T00:00:00Z');
    const input = { startedAt: d, count: 5 };
    const out = toSnakeCaseKeys(input);
    expect(out).toEqual({ started_at: d, count: 5 });
    expect(out.started_at).toBeInstanceOf(Date);
  });

  test('preserves Map and Set instances', () => {
    const m = new Map([['a', 1]]);
    const s = new Set([1, 2]);
    const out = toSnakeCaseKeys({ someMap: m, someSet: s });
    expect(out.some_map).toBe(m);
    expect(out.some_set).toBe(s);
  });

  test('preserves user class instances', () => {
    class Coding {
      constructor(
        public system: string,
        public code: string,
      ) {}
    }
    const c = new Coding('http://snomed.info/sct', '44054006');
    const out = toSnakeCaseKeys({ sourceCoding: c });
    expect(out.source_coding).toBe(c);
    expect(out.source_coding).toBeInstanceOf(Coding);
  });

  test('does not let a `__proto__` key mutate the result prototype', () => {
    // `JSON.parse` produces an own `__proto__` property (vs. an object
    // literal, which would set [[Prototype]]). A naive `out['__proto__'] = v`
    // would invoke Object.prototype's setter and replace the result's
    // prototype with `v`.
    const malicious = JSON.parse('{"__proto__":{"polluted":true}}');
    const out = toSnakeCaseKeys(malicious) as Record<string, unknown>;
    expect((out as { polluted?: unknown }).polluted).toBeUndefined();
    // Object.prototype must remain unaffected globally either way.
    expect(({} as { polluted?: unknown }).polluted).toBeUndefined();
  });
});
