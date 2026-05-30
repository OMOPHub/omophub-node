import { describe, expect, test } from 'vitest';
import {
  connectionError,
  parseErrorResponse,
  timeoutError,
} from '../../../src/common/utils/parse-error.js';

function makeResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

describe('parseErrorResponse', () => {
  test('maps 400 to validation_error', async () => {
    const err = await parseErrorResponse(
      makeResponse(400, { success: false, error: { message: 'bad input' } }),
    );
    expect(err.name).toBe('validation_error');
    expect(err.message).toBe('bad input');
    expect(err.statusCode).toBe(400);
  });

  test('maps 401 to invalid_api_key', async () => {
    const err = await parseErrorResponse(
      makeResponse(401, { success: false, error: { message: 'bad key' } }),
    );
    expect(err.name).toBe('invalid_api_key');
  });

  test('maps 403 to restricted_api_key', async () => {
    const err = await parseErrorResponse(makeResponse(403, { message: 'forbidden' }));
    expect(err.name).toBe('restricted_api_key');
  });

  test('maps 404 to not_found', async () => {
    const err = await parseErrorResponse(makeResponse(404, { message: 'gone' }));
    expect(err.name).toBe('not_found');
  });

  test('maps 429 to rate_limit_exceeded and parses Retry-After', async () => {
    const err = await parseErrorResponse(
      makeResponse(429, { message: 'slow down' }, { 'retry-after': '15' }),
    );
    expect(err.name).toBe('rate_limit_exceeded');
    expect(err.retryAfter).toBe(15);
  });

  test('maps 503 to service_unavailable', async () => {
    const err = await parseErrorResponse(makeResponse(503, { message: 'down' }));
    expect(err.name).toBe('service_unavailable');
  });

  test('maps other 5xx to internal_server_error', async () => {
    const err = await parseErrorResponse(makeResponse(500, { message: 'boom' }));
    expect(err.name).toBe('internal_server_error');
  });

  test('falls back to application_error for unmapped statuses', async () => {
    const err = await parseErrorResponse(makeResponse(418, { message: 'teapot' }));
    expect(err.name).toBe('application_error');
  });

  test('captures x-request-id header', async () => {
    const err = await parseErrorResponse(
      makeResponse(400, { message: 'bad' }, { 'x-request-id': 'req_xyz' }),
    );
    expect(err.requestId).toBe('req_xyz');
  });

  test('captures details from error envelope', async () => {
    const err = await parseErrorResponse(
      makeResponse(400, {
        success: false,
        error: { message: 'bad', details: { field: 'concept_id' } },
      }),
    );
    expect(err.details).toEqual({ field: 'concept_id' });
  });

  test('handles non-JSON body gracefully', async () => {
    const response = new Response('not json', {
      status: 500,
      headers: { 'content-type': 'text/plain' },
    });
    const err = await parseErrorResponse(response);
    expect(err.name).toBe('internal_server_error');
    expect(err.message).toBe('HTTP 500');
  });

  test('respects known error code from server when status is unmapped', async () => {
    const err = await parseErrorResponse(
      makeResponse(418, {
        success: false,
        error: { code: 'tier_limit_exceeded', message: 'upgrade' },
      }),
    );
    expect(err.name).toBe('tier_limit_exceeded');
  });

  test('body error code wins over the status map when both are present', async () => {
    const err = await parseErrorResponse(
      makeResponse(400, {
        success: false,
        error: { code: 'missing_required_field', message: 'no concept_id' },
      }),
    );
    expect(err.name).toBe('missing_required_field');
  });

  test('parses Retry-After on 503 (not just 429)', async () => {
    const err = await parseErrorResponse(
      makeResponse(503, { message: 'down' }, { 'retry-after': '30' }),
    );
    expect(err.name).toBe('service_unavailable');
    expect(err.retryAfter).toBe(30);
  });
});

describe('connectionError', () => {
  test('uses the Error message when available', () => {
    const err = connectionError(new Error('socket hang up'));
    expect(err.name).toBe('connection_error');
    expect(err.message).toBe('socket hang up');
    expect(err.statusCode).toBeNull();
  });

  test('falls back to a default message for non-Error throws', () => {
    const err = connectionError('weird');
    expect(err.message).toBe('Network error');
  });
});

describe('timeoutError', () => {
  test('returns a timeout_error with null statusCode', () => {
    const err = timeoutError();
    expect(err.name).toBe('timeout_error');
    expect(err.statusCode).toBeNull();
  });
});
