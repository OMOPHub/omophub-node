export interface AutocompleteOptions {
  vocabularyIds?: string[];
  domainIds?: string[];
  /** @deprecated Use `domainIds`. */
  domains?: string[];
  /** Maximum number of suggestions. Default 10 at the API; max 20. */
  pageSize?: number;
}
