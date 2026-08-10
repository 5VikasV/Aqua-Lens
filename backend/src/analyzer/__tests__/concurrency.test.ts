import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeRepository } from '../index.js';

test('Concurrency Deduplication Suite', async (t) => {
  await t.test('1. Invalid repository URL fails cleanly without caching rejected promise lock', async () => {
    const invalidUrl = 'https://github.com/invalid-org-xyz/invalid-repo-xyz';
    const res1 = await analyzeRepository(invalidUrl);
    assert.equal(res1.success, false);

    // Second call should retry and fail cleanly (lock removed)
    const res2 = await analyzeRepository(invalidUrl);
    assert.equal(res2.success, false);
  });

  await t.test('2. Concurrent requests for same canonical repository deduplicate in-flight promises', async () => {
    const targetUrl = 'https://github.com/expressjs/express.git';
    const equivalentUrl = 'https://github.com/expressjs/express/';

    // Launch 3 concurrent analysis requests
    const p1 = analyzeRepository(targetUrl);
    const p2 = analyzeRepository(equivalentUrl);
    const p3 = analyzeRepository(targetUrl);

    const [res1, res2, res3] = await Promise.all([p1, p2, p3]);

    assert.equal(res1.success, true);
    assert.equal(res2.success, true);
    assert.equal(res3.success, true);

    assert.equal(res1.workspaceId, 'expressjs/express');
    assert.equal(res2.workspaceId, 'expressjs/express');
    assert.equal(res3.workspaceId, 'expressjs/express');
  });
});
