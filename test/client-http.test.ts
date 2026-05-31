import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { OMOPHub } from '../src/client.js';
import { mockApiEnvelope, mockApiErrorBody, mockVocabulary } from './fixtures/index.js';
import {
  createMockFetch,
  enqueueError,
  enqueueNetworkError,
  enqueueSuccess,
  lastCall,
} from './helpers/mock-fetch.js';

describe('OMOPHub HTTP dispatch', () => {
  let originalRandom: typeof Math.random;
  let originalKey: string | undefined;

  beforeEach(() => {
    originalRandom = Math.random;
    Math.random = () => 0;
    originalKey = process.env.OMOPHUB_API_KEY;
    delete process.env.OMOPHUB_API_KEY;
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    Math.random = originalRandom;
    if (originalKey !== undefined) process.env.OMOPHUB_API_KEY = originalKey;
    vi.useRealTimers();
  });

  test('GET sends the right URL, method, and headers', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, [mockVocabulary()]);

    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const { data, error, headers } = await client.get('/vocabularies');

    expect(error).toBeNull();
    expect(data).toEqual([mockVocabulary()]);
    expect(headers).not.toBeNull();

    const { url, init } = lastCall(fetchMock);
    expect(url).toBe('https://api.omophub.com/v1/vocabularies');
    expect(init.method).toBe('GET');
    const requestHeaders = new Headers(init.headers);
    expect(requestHeaders.get('authorization')).toBe('Bearer oh_test');
    expect(requestHeaders.get('user-agent')).toMatch(/^omophub-node\//);
    expect(requestHeaders.get('content-type')).toBe('application/json');
    expect(init.body).toBeUndefined();
  });

  test('GET serialises query params, converting camelCase to snake_case', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, []);

    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.get('/vocabularies', {
      query: { page: 2, pageSize: 50, vocabularyIds: ['SNOMED', 'ICD10'] },
    });

    const { url } = lastCall(fetchMock);
    expect(url).toBe(
      'https://api.omophub.com/v1/vocabularies?page=2&page_size=50&vocabulary_ids=SNOMED%2CICD10',
    );
  });

  test('POST sends JSON body and sets Idempotency-Key when provided', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, { result: 'ok' });

    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.post('/concepts/batch', { concept_ids: [1, 2, 3] }, { idempotencyKey: 'idem_1' });

    const { init } = lastCall(fetchMock);
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ concept_ids: [1, 2, 3] }));
    expect(new Headers(init.headers).get('idempotency-key')).toBe('idem_1');
  });

  test('POST does NOT set Idempotency-Key when not provided', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, {});

    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.post('/concepts/batch', { x: 1 });

    const { init } = lastCall(fetchMock);
    expect(new Headers(init.headers).has('idempotency-key')).toBe(false);
  });

  test('returns ErrorResponse on 4xx without retrying', async () => {
    const fetchMock = createMockFetch();
    enqueueError(fetchMock, 404, mockApiErrorBody('not_found', 'concept missing'));

    const client = new OMOPHub('oh_test', { fetch: fetchMock, maxRetries: 3 });
    const { data, error, headers } = await client.get('/concepts/1');

    expect(data).toBeNull();
    expect(error?.name).toBe('not_found');
    expect(error?.message).toBe('concept missing');
    expect(error?.statusCode).toBe(404);
    expect(headers).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('retries on 429 honouring Retry-After', async () => {
    const fetchMock = createMockFetch();
    enqueueError(fetchMock, 429, mockApiErrorBody('rate_limit_exceeded', 'slow'), {
      'retry-after': '0',
    });
    enqueueSuccess(fetchMock, { ok: true });

    const client = new OMOPHub('oh_test', { fetch: fetchMock, maxRetries: 3 });
    const { data, error } = await client.get('/foo');

    expect(error).toBeNull();
    expect(data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('retries on 503 with exponential backoff and eventually succeeds', async () => {
    const fetchMock = createMockFetch();
    enqueueError(fetchMock, 503);
    enqueueError(fetchMock, 503);
    enqueueSuccess(fetchMock, { ok: true });

    const client = new OMOPHub('oh_test', { fetch: fetchMock, maxRetries: 3 });
    const { data, error } = await client.get('/foo');

    expect(error).toBeNull();
    expect(data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  test('gives up after maxRetries on persistent 503', async () => {
    const fetchMock = createMockFetch();
    enqueueError(fetchMock, 503);
    enqueueError(fetchMock, 503);
    enqueueError(fetchMock, 503);

    const client = new OMOPHub('oh_test', { fetch: fetchMock, maxRetries: 2 });
    const { data, error } = await client.get('/foo');

    expect(data).toBeNull();
    expect(error?.name).toBe('service_unavailable');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  test('retries on network error and then succeeds', async () => {
    const fetchMock = createMockFetch();
    enqueueNetworkError(fetchMock);
    enqueueSuccess(fetchMock, { ok: true });

    const client = new OMOPHub('oh_test', { fetch: fetchMock, maxRetries: 2 });
    const { error } = await client.get('/foo');

    expect(error).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('returns connection_error after exhausting retries on network failure', async () => {
    const fetchMock = createMockFetch();
    enqueueNetworkError(fetchMock, new Error('ECONNREFUSED'));
    enqueueNetworkError(fetchMock, new Error('ECONNREFUSED'));

    const client = new OMOPHub('oh_test', { fetch: fetchMock, maxRetries: 1 });
    const { data, error, headers } = await client.get('/foo');

    expect(data).toBeNull();
    expect(error?.name).toBe('connection_error');
    expect(error?.message).toBe('ECONNREFUSED');
    expect(headers).toBeNull();
  });

  test('DOES retry POST without an Idempotency-Key on 429 (pre-processing rejection)', async () => {
    // 429 means the server declined before touching state (RFC 9110
    // §15.5.29), so retry can't create duplicates — distinct from 5xx
    // where the upstream may have partially processed. The FHIR e2e
    // suite is the canonical case: every `fhir.*` endpoint is POST.
    const fetchMock = createMockFetch();
    enqueueError(fetchMock, 429, mockApiErrorBody('rate_limit_exceeded', 'slow'), {
      'retry-after': '0',
    });
    enqueueSuccess(fetchMock, { ok: true });

    const client = new OMOPHub('oh_test', { fetch: fetchMock, maxRetries: 3 });
    const { data, error } = await client.post('/concepts/batch', { concept_ids: [1] });

    expect(error).toBeNull();
    expect(data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('does NOT retry POST without an Idempotency-Key on 503', async () => {
    const fetchMock = createMockFetch();
    enqueueError(fetchMock, 503);

    const client = new OMOPHub('oh_test', { fetch: fetchMock, maxRetries: 3 });
    const { data, error } = await client.post('/concepts/batch', { concept_ids: [1] });

    expect(data).toBeNull();
    expect(error?.name).toBe('service_unavailable');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('retries POST WITH an Idempotency-Key on 503', async () => {
    const fetchMock = createMockFetch();
    enqueueError(fetchMock, 503);
    enqueueSuccess(fetchMock, { ok: true });

    const client = new OMOPHub('oh_test', { fetch: fetchMock, maxRetries: 3 });
    const { data, error } = await client.post(
      '/concepts/batch',
      { concept_ids: [1] },
      { idempotencyKey: 'idem_42' },
    );

    expect(error).toBeNull();
    expect(data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('does NOT retry POST without an Idempotency-Key on network error', async () => {
    const fetchMock = createMockFetch();
    enqueueNetworkError(fetchMock);

    const client = new OMOPHub('oh_test', { fetch: fetchMock, maxRetries: 3 });
    const { data, error } = await client.post('/concepts/batch', { concept_ids: [1] });

    expect(data).toBeNull();
    expect(error?.name).toBe('connection_error');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('attaches X-Vocab-Version header when vocabVersion is set', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, {});

    const client = new OMOPHub('oh_test', { fetch: fetchMock, vocabVersion: '2025.1' });
    await client.get('/concepts/201826');

    const { init } = lastCall(fetchMock);
    expect(new Headers(init.headers).get('x-vocab-version')).toBe('2025.1');
  });

  test('per-call headers merge onto client headers', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, {});

    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    await client.get('/concepts/1', { headers: { 'X-Custom': 'yes' } });

    const { init } = lastCall(fetchMock);
    const requestHeaders = new Headers(init.headers);
    expect(requestHeaders.get('x-custom')).toBe('yes');
    expect(requestHeaders.get('authorization')).toBe('Bearer oh_test');
  });

  test('caller AbortSignal propagates as a thrown AbortError, not a return value', async () => {
    const fetchMock = createMockFetch();
    fetchMock.mockImplementation((_url, init) => {
      const signal = (init as RequestInit | undefined)?.signal;
      return new Promise<Response>((_resolve, reject) => {
        if (signal) {
          signal.addEventListener('abort', () => {
            const abortErr = new Error('aborted');
            abortErr.name = 'AbortError';
            reject(abortErr);
          });
        }
      });
    });

    const client = new OMOPHub('oh_test', { fetch: fetchMock, maxRetries: 0, timeoutMs: 0 });
    const controller = new AbortController();
    const pending = client.get('/slow', { signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toThrow(/aborted/);
  });

  test('timeout aborts return timeout_error', async () => {
    // Pure fake timers (overrides the shouldAdvanceTime config from beforeEach)
    // so the timeout fires deterministically rather than depending on wall-clock.
    vi.useFakeTimers({ shouldAdvanceTime: false });
    const fetchMock = createMockFetch();
    fetchMock.mockImplementation((_url, init) => {
      const signal = (init as RequestInit | undefined)?.signal;
      return new Promise<Response>((_resolve, reject) => {
        if (signal) {
          signal.addEventListener('abort', () => {
            const abortErr = new Error('aborted');
            abortErr.name = 'AbortError';
            reject(abortErr);
          });
        }
      });
    });

    const client = new OMOPHub('oh_test', { fetch: fetchMock, maxRetries: 0, timeoutMs: 10 });
    const pending = client.get('/slow');
    await vi.advanceTimersByTimeAsync(20);
    const { data, error } = await pending;

    expect(data).toBeNull();
    expect(error?.name).toBe('timeout_error');
  });

  test('reads OMOPHUB_API_URL env var for baseUrl', async () => {
    const originalUrl = process.env.OMOPHUB_API_URL;
    process.env.OMOPHUB_API_URL = 'https://staging.omophub.com/v1';
    try {
      const fetchMock = createMockFetch();
      enqueueSuccess(fetchMock, []);
      const client = new OMOPHub('oh_test', { fetch: fetchMock });
      await client.get('/vocabularies');
      expect(lastCall(fetchMock).url).toBe('https://staging.omophub.com/v1/vocabularies');
    } finally {
      if (originalUrl !== undefined) process.env.OMOPHUB_API_URL = originalUrl;
      else delete process.env.OMOPHUB_API_URL;
    }
  });

  test('returns headers as a plain Record on every code path', async () => {
    const fetchMock = createMockFetch();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(mockApiEnvelope({ ok: true })), {
        status: 200,
        headers: { 'content-type': 'application/json', 'x-request-id': 'req_99' },
      }),
    );

    const client = new OMOPHub('oh_test', { fetch: fetchMock });
    const { headers } = await client.get('/foo');
    expect(headers?.['x-request-id']).toBe('req_99');
  });
});
