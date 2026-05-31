import type { ResolveCommonOptions } from './resolve-common-options.js';

export interface ResolveCodeableConceptOptions extends ResolveCommonOptions {
  /** Optional human-readable description of the CodeableConcept. */
  text?: string;
}
