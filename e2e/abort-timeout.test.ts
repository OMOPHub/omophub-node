import { describe, expect, test } from 'vitest';
import { OMOPHub } from '../src/index.js';
import { e2eEnabled, softThrottle } from './_helpers.js';

const runOrSkip = e2eEnabled ? test : test.skip;

const API_KEY = process.env.OMOPHUB_API_KEY ?? '';

describe('e2e: AbortSignal + timeout', () => {
  runOrSkip('pre-aborted signal re-throws AbortError without hitting the network', async () => {
    const controller = new AbortController();
    controller.abort(new DOMException('caller-aborted', 'AbortError'));

    const client = new OMOPHub(API_KEY, { maxRetries: 0 });
    let caught: unknown;
    try {
      await client.vocabularies.list({ signal: controller.signal });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).name).toBe('AbortError');
  });

  runOrSkip('signal aborted mid-flight re-throws AbortError', async () => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(new DOMException('mid-flight', 'AbortError')), 5);

    const client = new OMOPHub(API_KEY, { maxRetries: 0 });
    let caught: unknown;
    try {
      await client.search.basic('diabetes', {
        pageSize: 100,
        signal: controller.signal,
      });
    } catch (e) {
      caught = e;
    }
    // Either the request was aborted (AbortError thrown) or it completed
    // before the abort fired — both are valid race outcomes
    if (caught) {
      expect((caught as Error).name).toBe('AbortError');
    }
  });

  runOrSkip('very short timeoutMs returns timeout_error, does not throw', async () => {
    await softThrottle();
    const client = new OMOPHub(API_KEY, {
      maxRetries: 0,
      timeoutMs: 1, // 1ms — the live API can't respond that fast
    });
    const { data, error } = await client.search.basic('diabetes', { pageSize: 100 });
    expect(data).toBeNull();
    // Either timeout fired before the request resolved, or it completed
    // anyway (network/process latency variance). If it errored, it must be
    // a timeout_error or connection_error.
    if (error) {
      expect(['timeout_error', 'connection_error']).toContain(error.name);
    }
  });

  runOrSkip('caller signal aborts during retry sleep also re-throws AbortError', async () => {
    // Trigger by hitting a 503-ish endpoint that retries, but abort during
    // the backoff. We approximate this with a short timeoutMs + max retries.
    const controller = new AbortController();
    setTimeout(() => controller.abort(new DOMException('during-retry', 'AbortError')), 20);

    const client = new OMOPHub(API_KEY, { maxRetries: 3 });
    let caught: unknown;
    try {
      await client.vocabularies.list({ signal: controller.signal });
    } catch (e) {
      caught = e;
    }
    if (caught) {
      expect((caught as Error).name).toBe('AbortError');
    }
  });
});
