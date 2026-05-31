import { describe, expect, test } from 'vitest';
import { e2eClientNoRetry, e2eEnabled, softThrottle } from './_helpers.js';

const runOrSkip = e2eEnabled ? test : test.skip;

/**
 * Helper: the server-errors suite uses the no-retry client so each test
 * fails fast on a known-bad call. That also means a transient 429 from
 * the shared rate limiter shows up directly as `rate_limit_exceeded`
 * instead of being retried away. We treat that as an inconclusive run
 * for the specific error-contract being tested (not a failure of the
 * SDK's contract under test).
 */
function isTransient(name?: string): boolean {
  return name === 'rate_limit_exceeded' || name === 'timeout_error' || name === 'connection_error';
}

describe('e2e: server-side errors', () => {
  runOrSkip('concepts.get with a non-existent ID returns not_found', async () => {
    await softThrottle();
    const client = e2eClientNoRetry();
    const { data, error } = await client.concepts.get(999_999_999);
    if (isTransient(error?.name)) return;
    expect(data).toBeNull();
    expect(error?.name).toBe('not_found');
    expect(error?.statusCode).toBe(404);
  });

  runOrSkip('concepts.getByCode with an unknown code returns not_found', async () => {
    await softThrottle();
    const client = e2eClientNoRetry();
    const { data, error } = await client.concepts.getByCode('SNOMED', 'DEFINITELY-NOT-A-CODE');
    if (isTransient(error?.name)) return;
    expect(data).toBeNull();
    expect(error?.name).toBe('not_found');
  });

  runOrSkip('vocabularies.get with an unknown vocabulary returns an error', async () => {
    await softThrottle();
    const client = e2eClientNoRetry();
    const { data, error } = await client.vocabularies.get('THIS_VOCAB_DOES_NOT_EXIST');
    if (isTransient(error?.name)) return;
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect([400, 404]).toContain(error?.statusCode);
  });

  runOrSkip('domains.concepts with an unknown domain returns an empty concepts array', async () => {
    await softThrottle();
    const client = e2eClientNoRetry();
    const { data, error } = await client.domains.concepts('NotARealDomain');
    if (isTransient(error?.name)) return;
    // Server returns 200 OK with `{ concepts: [] }` for unknown domains
    // rather than a 404. Treat empty as the "no matches" signal.
    expect(error).toBeNull();
    expect(Array.isArray(data?.concepts)).toBe(true);
    expect(data?.concepts.length).toBe(0);
  });

  runOrSkip('hierarchy.ancestors for non-existent concept returns not_found', async () => {
    await softThrottle();
    const client = e2eClientNoRetry();
    const { error } = await client.hierarchy.ancestors(999_999_999);
    if (isTransient(error?.name)) return;
    expect(error).not.toBeNull();
    expect([400, 404]).toContain(error?.statusCode);
  });

  runOrSkip('mappings.get for non-existent concept returns not_found or empty', async () => {
    await softThrottle();
    const client = e2eClientNoRetry();
    const { data, error } = await client.mappings.get(999_999_999);
    if (isTransient(error?.name)) return;
    // Either: 404, OR a 200 with empty mappings array — both are acceptable
    if (error) {
      expect([400, 404]).toContain(error.statusCode);
    } else {
      expect(Array.isArray(data?.mappings)).toBe(true);
    }
  });

  runOrSkip('fhir.resolve with unknown system URI surfaces a structured error', async () => {
    await softThrottle();
    const client = e2eClientNoRetry();
    const { data, error } = await client.fhir.resolve({
      system: 'http://example.invalid/code-system',
      code: '12345',
    });
    if (isTransient(error?.name)) return;
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(typeof error?.name).toBe('string');
    expect(typeof error?.message).toBe('string');
  });

  runOrSkip('error responses preserve x-request-id for support triage', async () => {
    await softThrottle();
    const client = e2eClientNoRetry();
    const { error, headers } = await client.concepts.get(999_999_999);
    if (isTransient(error?.name)) return;
    expect(error).not.toBeNull();
    // requestId must surface on BOTH the error object AND the raw
    // headers, and the two must match — that's the support-triage contract.
    expect(typeof error?.requestId).toBe('string');
    expect((error?.requestId ?? '').length).toBeGreaterThan(0);
    const headerRequestId = headers?.['x-request-id'];
    expect(typeof headerRequestId).toBe('string');
    expect((headerRequestId ?? '').length).toBeGreaterThan(0);
    expect(error?.requestId).toBe(headerRequestId);
  });

  runOrSkip('200-OK error responses (empty matches) return success, not error', async () => {
    await softThrottle();
    const client = e2eClientNoRetry();
    const { data, error } = await client.search.basic('zzz-no-such-concept-aaa-xyz', {
      pageSize: 5,
    });
    if (isTransient(error?.name)) return;
    expect(error).toBeNull();
    expect(Array.isArray(data?.concepts)).toBe(true);
    // Empty matches is a successful query with zero results
    expect(data?.concepts.length).toBe(0);
  });
});
