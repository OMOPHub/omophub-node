export interface AutocompleteOptions {
  vocabularyIds?: string[];
  domains?: string[];
  /** Maximum number of suggestions. Default 10 at the API; max 100. */
  pageSize?: number;
}
