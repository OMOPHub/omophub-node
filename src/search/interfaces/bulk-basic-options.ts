import type { BulkSearchDefaults } from './bulk-search.js';

export interface BulkBasicOptions {
  /** Shared params applied to every search in the batch unless overridden. */
  defaults?: BulkSearchDefaults;
}
