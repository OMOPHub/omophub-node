import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { OMOPHub } from '../src/client.js';
import { createMockFetch, enqueueSuccess, lastCall } from './helpers/mock-fetch.js';

describe('OMOPHub constructor', () => {
  let originalKey: string | undefined;
  let originalUrl: string | undefined;

  beforeEach(() => {
    originalKey = process.env.OMOPHUB_API_KEY;
    originalUrl = process.env.OMOPHUB_API_URL;
    delete process.env.OMOPHUB_API_KEY;
    delete process.env.OMOPHUB_API_URL;
  });

  afterEach(() => {
    if (originalKey !== undefined) process.env.OMOPHUB_API_KEY = originalKey;
    if (originalUrl !== undefined) process.env.OMOPHUB_API_URL = originalUrl;
  });

  test('accepts an API key argument and defaults other options', async () => {
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, {});
    const client = new OMOPHub('oh_test_key', { fetch: fetchMock });
    await client.get('/anything');

    expect(client.baseUrl).toBe('https://api.omophub.com/v1');
    expect(client.timeoutMs).toBe(30_000);
    expect(client.maxRetries).toBe(3);
    expect(client.userAgent).toMatch(/^omophub-node\/\d+\.\d+\.\d+/);
    expect(client.vocabVersion).toBeUndefined();
    expect(new Headers(lastCall(fetchMock).init.headers).get('authorization')).toBe(
      'Bearer oh_test_key',
    );
  });

  test('throws if no API key is provided and OMOPHUB_API_KEY is unset', () => {
    expect(() => new OMOPHub()).toThrowError(/Missing API key/);
  });

  test('reads OMOPHUB_API_KEY from env when no argument is provided', async () => {
    process.env.OMOPHUB_API_KEY = 'oh_env_key';
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, {});
    const client = new OMOPHub(undefined, { fetch: fetchMock });
    await client.get('/anything');
    expect(new Headers(lastCall(fetchMock).init.headers).get('authorization')).toBe(
      'Bearer oh_env_key',
    );
  });

  test('argument takes precedence over OMOPHUB_API_KEY env', async () => {
    process.env.OMOPHUB_API_KEY = 'oh_env_key';
    const fetchMock = createMockFetch();
    enqueueSuccess(fetchMock, {});
    const client = new OMOPHub('oh_arg_key', { fetch: fetchMock });
    await client.get('/anything');
    expect(new Headers(lastCall(fetchMock).init.headers).get('authorization')).toBe(
      'Bearer oh_arg_key',
    );
  });

  test('reads OMOPHUB_API_URL from env when no baseUrl option is provided', () => {
    process.env.OMOPHUB_API_URL = 'https://staging.omophub.com/v1';
    const client = new OMOPHub('oh_test');
    expect(client.baseUrl).toBe('https://staging.omophub.com/v1');
  });

  test('baseUrl option takes precedence over OMOPHUB_API_URL env', () => {
    process.env.OMOPHUB_API_URL = 'https://staging.omophub.com/v1';
    const client = new OMOPHub('oh_test', { baseUrl: 'https://custom.example.com' });
    expect(client.baseUrl).toBe('https://custom.example.com');
  });

  test('accepts overrides for timeoutMs, maxRetries, userAgent, vocabVersion', () => {
    const client = new OMOPHub('oh_test', {
      timeoutMs: 5_000,
      maxRetries: 0,
      userAgent: 'my-app/1.0.0',
      vocabVersion: '2025.1',
    });
    expect(client.timeoutMs).toBe(5_000);
    expect(client.maxRetries).toBe(0);
    expect(client.userAgent).toBe('my-app/1.0.0');
    expect(client.vocabVersion).toBe('2025.1');
  });

  test('does not expose the API key as a public field', () => {
    const client = new OMOPHub('oh_secret');
    expect((client as unknown as Record<string, unknown>).apiKey).toBeUndefined();
    expect(Object.keys(client)).not.toContain('apiKey');
  });
});
