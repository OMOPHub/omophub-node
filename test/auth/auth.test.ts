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
});
