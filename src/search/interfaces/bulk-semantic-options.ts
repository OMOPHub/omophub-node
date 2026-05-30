import type { BulkSearchDefaults } from './bulk-search.js';

export interface BulkSemanticDefaults extends BulkSearchDefaults {
  threshold?: number;
}

export interface BulkSemanticOptions {
  /** Shared params applied to every search in the batch unless overridden. */
  defaults?: BulkSemanticDefaults;
}
