import type { ResponseMeta } from '../../interfaces.js';

export interface UnwrappedEnvelope<T> {
  data: T;
  meta: ResponseMeta | null;
}

/**
 * Tolerantly extracts payload and metadata from a 2xx response body.
 *
 * The OMOPHub API returns `{ success, data, meta }` for most endpoints
 * but a few legacy paths return the data payload directly. To avoid
 * mis-classifying a user payload that happens to have a top-level `data`
 * field (e.g. a paginated result), the heuristic requires a second
 * envelope-specific key — `success` or `meta` — to co-occur with `data`.
 *
 * - Envelope (`{ data, success }` or `{ data, meta }` or `{ data, success, meta }`):
 *   unwrap to `body.data` and extract `body.meta`.
 * - Anything else: treat the body as the payload (no meta).
 *
 * Caller-side error envelopes (`success: false`) are not expected here —
 * the dispatch loop routes 4xx/5xx through `parseErrorResponse` first.
 */
export function unwrapEnvelope<T>(body: unknown): UnwrappedEnvelope<T> {
  if (body && typeof body === 'object' && 'data' in body && ('success' in body || 'meta' in body)) {
    const envelope = body as { data: unknown; meta?: unknown };
    return {
      data: envelope.data as T,
      meta: extractMeta(envelope.meta),
    };
  }
  return { data: body as T, meta: null };
}

function extractMeta(raw: unknown): ResponseMeta | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;
  const meta: ResponseMeta = {};
  if (typeof m.request_id === 'string') meta.request_id = m.request_id;
  if (typeof m.timestamp === 'string') meta.timestamp = m.timestamp;
  if (typeof m.vocab_release === 'string') meta.vocab_release = m.vocab_release;
  if (m.pagination && typeof m.pagination === 'object') {
    meta.pagination = m.pagination as ResponseMeta['pagination'];
  }
  return Object.keys(meta).length > 0 ? meta : null;
}
