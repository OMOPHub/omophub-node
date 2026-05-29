import type { QueryValue } from '../interfaces/per-call-options.js';
import { camelToSnakeCase } from './to-snake-case.js';

/**
 * Serialises a record of options into a URL query string.
 * - camelCase keys are converted to snake_case.
 * - `null` and `undefined` values are dropped.
 * - Arrays are comma-joined (matches the OMOPHub API convention).
 * - Empty arrays are dropped.
 * - Booleans and numbers are stringified.
 *
 * Returns the encoded query body **without** a leading `?`.
 */
export function buildQuery(params: Record<string, QueryValue> | undefined): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const snakeKey = camelToSnakeCase(key);
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      search.append(snakeKey, value.join(','));
    } else {
      search.append(snakeKey, String(value));
    }
  }
  return search.toString();
}

export function appendQuery(path: string, query: string): string {
  if (!query) return path;
  return `${path}${path.includes('?') ? '&' : '?'}${query}`;
}
