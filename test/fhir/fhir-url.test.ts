import { describe, expect, test } from 'vitest';
import { omophubFhirUrl } from '../../src/fhir/fhir-url.js';

describe('omophubFhirUrl', () => {
  test('defaults to r4', () => {
    expect(omophubFhirUrl()).toBe('https://fhir.omophub.com/fhir/r4');
  });

  test('accepts r4b, r5, r6', () => {
    expect(omophubFhirUrl('r4b')).toBe('https://fhir.omophub.com/fhir/r4b');
    expect(omophubFhirUrl('r5')).toBe('https://fhir.omophub.com/fhir/r5');
    expect(omophubFhirUrl('r6')).toBe('https://fhir.omophub.com/fhir/r6');
  });
});
