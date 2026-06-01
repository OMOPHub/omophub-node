import type { Concept } from '../../concepts/interfaces/concept.js';
import type {
  SearchFacets,
  SearchMetadata,
  SearchResult,
} from '../../search/interfaces/search-result.js';
import type { SemanticSearchResult } from '../../search/interfaces/semantic-search-result.js';

/**
 * Normalises the wire shape of `GET /search/concepts` and
 * `POST /search/advanced` into a stable `SearchResult` object.
 *
 * The server historically returned several shapes for the inner `data`
 * payload (post-envelope-unwrap):
 *   1. `{ concepts: Concept[], facets, search_metadata }` — modern.
 *   2. `{ data: Concept[] }` — legacy paginated wrapper.
 *   3. `Concept[]` — bare array.
 *
 * Callers always see shape #1 regardless of what the server sent.
 *
 * @see project memory `project_search_api_response_shapes.md`
 */
export function normaliseBasicSearchData(raw: unknown): SearchResult {
  if (Array.isArray(raw)) {
    return { concepts: raw as Concept[] };
  }
  if (!raw || typeof raw !== 'object') {
    return { concepts: [] };
  }
  const obj = raw as Record<string, unknown>;
  const concepts = pickArray<Concept>(obj.concepts) ?? pickArray<Concept>(obj.data) ?? [];
  const result: SearchResult = { concepts };
  if (obj.facets && typeof obj.facets === 'object') {
    result.facets = obj.facets as SearchFacets;
  }
  if (obj.search_metadata && typeof obj.search_metadata === 'object') {
    result.search_metadata = obj.search_metadata as SearchMetadata;
  }
  return result;
}

/**
 * Normalises `GET /search/semantic` into a flat
 * `SemanticSearchResult[]` for the iter/all helpers. Handles both
 * `{ results: [...] }` and bare-array forms.
 */
export function normaliseSemanticSearchData(raw: unknown): SemanticSearchResult[] {
  if (Array.isArray(raw)) return raw as SemanticSearchResult[];
  if (!raw || typeof raw !== 'object') return [];
  const obj = raw as Record<string, unknown>;
  return (
    pickArray<SemanticSearchResult>(obj.results) ?? pickArray<SemanticSearchResult>(obj.data) ?? []
  );
}

function pickArray<T>(value: unknown): T[] | null {
  return Array.isArray(value) ? (value as T[]) : null;
}
