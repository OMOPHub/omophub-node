import { type Mock, vi } from 'vitest';
import { mockApiEnvelope } from '../fixtures/index.js';

export type MockFetch = Mock<typeof fetch>;

export function createMockFetch(): MockFetch {
  return vi.fn() as MockFetch;
}

export function enqueueSuccess<T>(
  fetchMock: MockFetch,
  data: T,
  headers: Record<string, string> = {},
): void {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(mockApiEnvelope(data)), {
      status: 200,
      headers: { 'content-type': 'application/json', ...headers },
    }),
  );
}

export function enqueueRawBody(
  fetchMock: MockFetch,
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): void {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json', ...headers },
    }),
  );
}

export function enqueueError(
  fetchMock: MockFetch,
  status: number,
  // Default body omits `error.code` so the HTTP-status → error-name mapping
  // in parseErrorResponse drives the outcome. Tests that want to assert
  // a specific server-supplied code pass it explicitly.
  body: unknown = {
    success: false,
    error: { message: `HTTP ${status}` },
  },
  headers: Record<string, string> = {},
): void {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json', ...headers },
    }),
  );
}

export function enqueueNetworkError(
  fetchMock: MockFetch,
  err: Error = new Error('ECONNREFUSED'),
): void {
  fetchMock.mockRejectedValueOnce(err);
}

export function lastCall(fetchMock: MockFetch): { url: string; init: RequestInit } {
  const calls = fetchMock.mock.calls;
  if (calls.length === 0) throw new Error('fetchMock has no calls');
  const call = calls[calls.length - 1];
  if (!call) throw new Error('fetchMock has no calls');
  const [arg0, arg1] = call;
  const url = typeof arg0 === 'string' ? arg0 : (arg0 as URL).toString();
  return { url, init: (arg1 ?? {}) as RequestInit };
}

export function headersFromInit(init: RequestInit): Headers {
  return new Headers(init.headers);
}
