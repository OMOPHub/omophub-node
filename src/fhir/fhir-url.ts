export type FhirVersion = 'r4' | 'r4b' | 'r5' | 'r6';

/**
 * Returns the URL of OMOPHub's hosted FHIR Terminology Service for the
 * given version. No client / API key required — this is a pointer for
 * users who want to hit the raw FHIR endpoints (CodeSystem/$lookup,
 * ValueSet/$expand, etc.) with their own FHIR client library.
 *
 * ```ts
 * import { omophubFhirUrl } from '@omophub/omophub-node';
 *
 * const base = omophubFhirUrl('r4');
 * // → https://fhir.omophub.com/fhir/r4
 * ```
 */
export function omophubFhirUrl(version: FhirVersion = 'r4'): string {
  return `https://fhir.omophub.com/fhir/${version}`;
}
