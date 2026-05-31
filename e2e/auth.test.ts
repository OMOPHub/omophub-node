import { describe, expect, test } from 'vitest';
import { OMOPHub, OMOPHubError } from '../src/index.js';
import { e2eEnabled, softThrottle } from './_helpers.js';

const runOrSkip = e2eEnabled ? test : test.skip;

describe('e2e: auth', () => {
  test('constructor throws OMOPHubError when no key is supplied or in env', () => {
    const original = process.env.OMOPHUB_API_KEY;
    delete process.env.OMOPHUB_API_KEY;
    try {
      expect(() => new OMOPHub()).toThrowError(OMOPHubError);
    } finally {
      if (original !== undefined) process.env.OMOPHUB_API_KEY = original;
    }
  });

  runOrSkip('an obviously bad API key gets invalid_api_key from the live API', async () => {
    await softThrottle();
    const client = new OMOPHub('oh_invalid_definitely_not_a_real_key_xxx', {
      maxRetries: 0,
    });
    const { data, error } = await client.vocabularies.list({ pageSize: 1 });
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    // Server may use any of these depending on tier / gating
    expect([
      'invalid_api_key',
      'restricted_api_key',
      'missing_api_key',
      'application_error',
    ]).toContain(error?.name);
    expect([401, 403]).toContain(error?.statusCode);
  });

  runOrSkip('empty API key string is rejected (treated as missing)', () => {
    expect(() => new OMOPHub('')).toThrowError(OMOPHubError);
  });

  runOrSkip('whitespace-only key passes the constructor but server rejects it', async () => {
    await softThrottle();
    const client = new OMOPHub('   ', { maxRetries: 0 });
    const { error } = await client.vocabularies.list({ pageSize: 1 });
    expect(error).not.toBeNull();
    expect([401, 403]).toContain(error?.statusCode);
  });
});
