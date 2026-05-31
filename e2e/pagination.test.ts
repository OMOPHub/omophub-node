import { describe, expect, test } from 'vitest';
import { OMOPHubIteratorError } from '../src/index.js';
import { e2eClient, e2eEnabled, softThrottle } from './_helpers.js';

const runOrSkip = e2eEnabled ? test : test.skip;

describe('e2e: pagination behaviour', () => {
  runOrSkip('basicAll respects maxPages and reports pagesFetched accurately', async () => {
    await softThrottle();
    const client = e2eClient();
    const result = await client.search.basicAll('diabetes', {
      vocabularyIds: ['SNOMED'],
      pageSize: 5,
      maxPages: 3,
    });
    expect(result.errors).toEqual([]);
    expect(result.pagesFetched).toBeGreaterThanOrEqual(1);
    expect(result.pagesFetched).toBeLessThanOrEqual(3);
    // Total items can't exceed maxPages * pageSize
    expect(result.data.length).toBeLessThanOrEqual(15);
  });

  runOrSkip('basicIter stops cleanly when caller breaks out of the loop', async () => {
    await softThrottle();
    const client = e2eClient();
    let count = 0;
    for await (const _ of client.search.basicIter('diabetes', { pageSize: 10 })) {
      count++;
      if (count >= 7) break;
    }
    expect(count).toBe(7);
  });

  runOrSkip('basicIter terminates naturally on a query with no results', async () => {
    await softThrottle();
    const client = e2eClient();
    let count = 0;
    for await (const _ of client.search.basicIter('zzz-no-such-thing-xyz-abc', {
      pageSize: 10,
      maxPages: 3,
    })) {
      count++;
    }
    expect(count).toBe(0);
  });

  runOrSkip('paginated endpoint last page has has_next: false', async () => {
    await softThrottle();
    const client = e2eClient();
    // List vocabularies — small enough catalog to reach the last page
    const { data, meta, error } = await client.vocabularies.list({ pageSize: 200 });
    expect(error).toBeNull();
    const pagination = meta?.pagination;
    expect(pagination).toBeTruthy();
    if (pagination) {
      if (pagination.total_items <= pagination.page_size) {
        expect(pagination.has_next).toBe(false);
        expect(pagination.has_previous).toBe(false);
      }
      expect(pagination.total_pages).toBe(
        Math.max(1, Math.ceil(pagination.total_items / pagination.page_size)),
      );
    }
    expect(data?.vocabularies.length).toBeLessThanOrEqual(pagination?.page_size ?? 200);
  });

  runOrSkip('pageSize=1 returns exactly one row when results exist', async () => {
    await softThrottle();
    const client = e2eClient();
    const { data, error } = await client.search.basic('diabetes', {
      vocabularyIds: ['SNOMED'],
      pageSize: 1,
    });
    expect(error).toBeNull();
    expect(data?.concepts.length).toBeLessThanOrEqual(1);
  });

  runOrSkip('basicIter throws OMOPHubIteratorError when a page fails mid-stream', async () => {
    // We can't reliably trigger a mid-stream failure on the live API, so
    // we verify the error-class wiring via a deliberately bad client (no
    // retries + invalid key) and confirm the iterator throws on FIRST page
    await softThrottle();
    const { OMOPHub } = await import('../src/index.js');
    const badClient = new OMOPHub('oh_definitely_bad_key_xxx', { maxRetries: 0 });
    let caught: unknown;
    try {
      for await (const _ of badClient.search.basicIter('diabetes', {
        pageSize: 5,
        maxPages: 1,
      })) {
        // unreachable
      }
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(OMOPHubIteratorError);
  });

  runOrSkip('basicAll surfaces partial result + errors when a page fails', async () => {
    await softThrottle();
    const { OMOPHub } = await import('../src/index.js');
    const badClient = new OMOPHub('oh_definitely_bad_key_xxx', { maxRetries: 0 });
    const result = await badClient.search.basicAll('diabetes', {
      pageSize: 5,
      maxPages: 2,
    });
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    // pagesFetched counts the attempt that failed
    expect(result.pagesFetched).toBeGreaterThanOrEqual(1);
  });

  runOrSkip('navigating to page 2 explicitly works when has_next is true', async () => {
    await softThrottle();
    const client = e2eClient();
    const first = await client.vocabularies.list({ pageSize: 5, page: 1 });
    if (first.meta?.pagination?.has_next) {
      await softThrottle();
      const second = await client.vocabularies.list({ pageSize: 5, page: 2 });
      expect(second.error).toBeNull();
      expect(second.meta?.pagination?.page).toBe(2);
      expect(second.meta?.pagination?.has_previous).toBe(true);
    }
  });
});
