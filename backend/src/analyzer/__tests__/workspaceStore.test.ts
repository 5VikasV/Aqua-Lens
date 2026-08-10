import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkspaceStore } from '../workspaceStore.js';
import { AnalysisWorkspace } from '../../types/index.js';

function createDummyWorkspace(id: string, url: string): AnalysisWorkspace {
  return {
    id,
    repositoryUrl: url,
    files: [],
    fileContents: new Map([['index.ts', 'console.log("hello");']]),
    symbolsByFile: new Map(),
    dependencyGraph: { nodes: [], edges: [] },
    packageDependencies: { dependencies: {}, devDependencies: {} },
    createdAt: new Date().toISOString()
  };
}

test('WorkspaceStore Hardening Suite: LRU & Lazy TTL', async (t) => {
  await t.test('1. Save and retrieve workspace', () => {
    const store = new WorkspaceStore(10, 10000);
    const ws = createDummyWorkspace('org/repo1', 'https://github.com/org/repo1');
    store.saveWorkspace(ws);

    assert.equal(store.hasWorkspace('org/repo1'), true);
    assert.equal(store.hasWorkspace('https://github.com/org/repo1'), true);

    const retrieved = store.getWorkspace('org/repo1');
    assert.ok(retrieved);
    assert.equal(retrieved.id, 'org/repo1');
  });

  await t.test('2. Max capacity LRU eviction', () => {
    const maxCap = 3;
    const store = new WorkspaceStore(maxCap, 10000);

    for (let i = 1; i <= 4; i++) {
      store.saveWorkspace(createDummyWorkspace(`org/repo${i}`, `https://github.com/org/repo${i}`));
    }

    // Capacity is 3, repo1 (oldest inserted) should be evicted
    assert.equal(store.getSize(), 3);
    assert.equal(store.getWorkspace('org/repo1'), undefined);
    assert.ok(store.getWorkspace('org/repo2'));
    assert.ok(store.getWorkspace('org/repo3'));
    assert.ok(store.getWorkspace('org/repo4'));
  });

  await t.test('3. Accessing a workspace updates its LRU position', () => {
    const store = new WorkspaceStore(3, 10000);
    store.saveWorkspace(createDummyWorkspace('org/repo1', 'https://github.com/org/repo1'));
    store.saveWorkspace(createDummyWorkspace('org/repo2', 'https://github.com/org/repo2'));
    store.saveWorkspace(createDummyWorkspace('org/repo3', 'https://github.com/org/repo3'));

    // Touch repo1 so it becomes Most Recently Used
    assert.ok(store.getWorkspace('org/repo1'));

    // Now insert repo4
    store.saveWorkspace(createDummyWorkspace('org/repo4', 'https://github.com/org/repo4'));

    // repo2 should be evicted (as repo1 was touched and updated)
    assert.ok(store.getWorkspace('org/repo1'));
    assert.equal(store.getWorkspace('org/repo2'), undefined);
    assert.ok(store.getWorkspace('org/repo3'));
    assert.ok(store.getWorkspace('org/repo4'));
  });

  await t.test('4. Lazy TTL expiration', async () => {
    const shortTtlMs = 50; // 50ms TTL for testing
    const store = new WorkspaceStore(10, shortTtlMs);
    store.saveWorkspace(createDummyWorkspace('org/repo-ttl', 'https://github.com/org/repo-ttl'));

    assert.ok(store.getWorkspace('org/repo-ttl'));

    // Wait longer than TTL
    await new Promise(r => setTimeout(r, 70));

    // Expired workspace cannot be retrieved and is removed
    assert.equal(store.getWorkspace('org/repo-ttl'), undefined);
    assert.equal(store.hasWorkspace('org/repo-ttl'), false);
  });

  await t.test('5. Default max 10 workspace limit enforcement', () => {
    const store = new WorkspaceStore(10, 100000);
    for (let i = 1; i <= 15; i++) {
      store.saveWorkspace(createDummyWorkspace(`org/repo${i}`, `https://github.com/org/repo${i}`));
    }

    assert.equal(store.getSize(), 10);
    // Repos 1 to 5 evicted
    assert.equal(store.getWorkspace('org/repo1'), undefined);
    assert.equal(store.getWorkspace('org/repo5'), undefined);
    assert.ok(store.getWorkspace('org/repo6'));
    assert.ok(store.getWorkspace('org/repo15'));
  });
});
