import { describe, expect, test } from 'vitest';
import { unwrapEnvelope } from '../../../src/common/utils/unwrap-envelope.js';

describe('unwrapEnvelope', () => {
  test('extracts data and meta from a standard envelope', () => {
    const body = {
      success: true,
      data: { vocabulary_id: 'SNOMED' },
      meta: { request_id: 'req_1', timestamp: '2026-05-29T00:00:00Z', vocab_release: '2025.1' },
    };
    const { data, meta } = unwrapEnvelope(body);
    expect(data).toEqual({ vocabulary_id: 'SNOMED' });
    expect(meta).toEqual({
      request_id: 'req_1',
      timestamp: '2026-05-29T00:00:00Z',
      vocab_release: '2025.1',
    });
  });

  test('extracts pagination from meta', () => {
    const body = {
      data: [{ id: 1 }],
      meta: {
        pagination: { page: 1, page_size: 20, total_items: 1, total_pages: 1, has_next: false },
      },
    };
    const { data, meta } = unwrapEnvelope(body);
    expect(data).toEqual([{ id: 1 }]);
    expect(meta?.pagination).toEqual({
      page: 1,
      page_size: 20,
      total_items: 1,
      total_pages: 1,
      has_next: false,
    });
  });

  test('returns null meta when envelope has success but no meta', () => {
    expect(unwrapEnvelope({ success: true, data: 42 })).toEqual({ data: 42, meta: null });
  });

  test('treats raw payload as data when no `data` key is present', () => {
    expect(unwrapEnvelope([1, 2, 3])).toEqual({ data: [1, 2, 3], meta: null });
    expect(unwrapEnvelope('plain')).toEqual({ data: 'plain', meta: null });
  });

  test('does NOT unwrap a payload that happens to have a `data` key but no envelope sibling', () => {
    // A user-shaped payload like `{ data: [...] }` with no success/meta is
    // returned as-is so we never accidentally peel a layer the API didn't add.
    const userPayload = { data: [{ concept_id: 1 }] };
    expect(unwrapEnvelope(userPayload)).toEqual({ data: userPayload, meta: null });
  });

  test('handles null body', () => {
    expect(unwrapEnvelope(null)).toEqual({ data: null, meta: null });
  });
});
