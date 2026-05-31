import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { getApiKey, hasApiKey, setApiKey } from '../../src/auth/auth.js';

describe('auth helpers', () => {
  let originalKey: string | undefined;

  beforeEach(() => {
    originalKey = process.env.OMOPHUB_API_KEY;
    delete process.env.OMOPHUB_API_KEY;
  });

  afterEach(() => {
    if (originalKey !== undefined) process.env.OMOPHUB_API_KEY = originalKey;
    else delete process.env.OMOPHUB_API_KEY;
  });

  test('getApiKey returns undefined when env is unset', () => {
    expect(getApiKey()).toBeUndefined();
  });

  test('getApiKey returns the env value when set', () => {
    process.env.OMOPHUB_API_KEY = 'oh_test_value';
    expect(getApiKey()).toBe('oh_test_value');
  });

  test('setApiKey writes to OMOPHUB_API_KEY', () => {
    setApiKey('oh_set_value');
    expect(process.env.OMOPHUB_API_KEY).toBe('oh_set_value');
    expect(getApiKey()).toBe('oh_set_value');
  });

  test('hasApiKey returns false when unset or empty', () => {
    expect(hasApiKey()).toBe(false);
    process.env.OMOPHUB_API_KEY = '';
    expect(hasApiKey()).toBe(false);
  });

  test('hasApiKey returns true when set to a non-empty string', () => {
    process.env.OMOPHUB_API_KEY = 'oh_present';
    expect(hasApiKey()).toBe(true);
  });

  test('setApiKey rejects empty / whitespace-only keys (consistent with hasApiKey)', () => {
    expect(() => setApiKey('')).toThrowError(/non-empty/);
    expect(() => setApiKey('   ')).toThrowError(/non-empty/);
    // env stays unset, no silent write
    expect(process.env.OMOPHUB_API_KEY).toBeUndefined();
  });

  test('setApiKey strips surrounding whitespace before persisting', () => {
    // A leading newline or trailing space slipped from a `.env` parser or
    // copy-paste must not leak into the Authorization header.
    setApiKey('  oh_padded_value\n');
    expect(process.env.OMOPHUB_API_KEY).toBe('oh_padded_value');
    expect(getApiKey()).toBe('oh_padded_value');
  });

  test('setApiKey re-throws read-only env errors as OMOPHubError', async () => {
    const { OMOPHubError } = await import('../../src/errors.js');
    // Node's `process.env` is a Proxy that rejects accessor descriptors,
    // so we wrap it in our own Proxy whose `set` trap throws — simulating
    // a frozen / read-only env in an edge runtime — and swap it in
    // temporarily.
    const realEnv = process.env;
    const readOnlyEnv = new Proxy(
      {},
      {
        get() {
          return undefined;
        },
        set() {
          throw new TypeError('process.env is read-only here');
        },
      },
    ) as NodeJS.ProcessEnv;
    Object.defineProperty(process, 'env', {
      configurable: true,
      get: () => readOnlyEnv,
    });
    try {
      expect(() => setApiKey('oh_test_value')).toThrowError(OMOPHubError);
      expect(() => setApiKey('oh_test_value')).toThrowError(/could not write to process.env/);
    } finally {
      Object.defineProperty(process, 'env', {
        configurable: true,
        writable: true,
        value: realEnv,
      });
    }
  });
});
