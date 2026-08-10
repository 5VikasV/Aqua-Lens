import test from 'node:test';
import assert from 'node:assert/strict';
import { FileMetric } from '../../types/index.js';
import {
  investigateWorkspace,
  WorkspaceNotFoundError,
  InvalidQuestionError
} from '../aiInvestigator.js';
import { workspaceStore } from '../workspaceStore.js';

test('AI Investigator Engine Test Suite', async (t) => {
  const testWorkspaceId = 'test-org/test-repo';
  const sampleFiles: FileMetric[] = [
    { path: 'src/auth.ts', extension: '.ts', language: 'TypeScript', sizeBytes: 300, lineCount: 15, importsCount: 1, exportsCount: 1 },
    { path: 'src/config.ts', extension: '.ts', language: 'TypeScript', sizeBytes: 150, lineCount: 8, importsCount: 0, exportsCount: 1 }
  ];

  const sampleContents = new Map<string, string>([
    ['src/auth.ts', [
      "export function generateToken(userId: string): string {",
      "  return 'signed-jwt-token-' + userId;",
      "}",
      "export function validateToken(token: string): boolean {",
      "  return token.startsWith('signed-jwt-token-');",
      "}"
    ].join('\n')],
    ['src/config.ts', [
      "export const jwtSecret = 'super-secret-key';",
    ].join('\n')]
  ]);

  workspaceStore.saveWorkspace({
    id: testWorkspaceId,
    repositoryUrl: 'https://github.com/test-org/test-repo.git',
    files: sampleFiles,
    fileContents: sampleContents,
    symbolsByFile: new Map(),
    dependencyGraph: { nodes: [], edges: [] },
    packageDependencies: { dependencies: {}, devDependencies: {} },
    createdAt: new Date().toISOString()
  });

  await t.test('1. Missing workspace ID throws WorkspaceNotFoundError', async () => {
    await assert.rejects(
      async () => {
        await investigateWorkspace('non-existent-workspace-xyz', 'How does token validation work?');
      },
      (err: any) => err instanceof WorkspaceNotFoundError
    );
  });

  await t.test('2. Empty question throws InvalidQuestionError', async () => {
    await assert.rejects(
      async () => {
        await investigateWorkspace(testWorkspaceId, '   ');
      },
      (err: any) => err instanceof InvalidQuestionError
    );
  });

  await t.test('3. Gemini unavailable / missing API key fallback handling', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      const res = await investigateWorkspace(testWorkspaceId, 'generateToken');
      assert.equal(res.success, true);
      assert.ok(res.answer.includes('Retrieved 1 relevant files'));
      assert.ok(res.evidence.length >= 1);
      assert.equal(res.evidence[0].id, 'ev-1');
      assert.equal(res.evidence[0].filePath, 'src/auth.ts');
    } finally {
      process.env.GEMINI_API_KEY = originalKey;
    }
  });

  await t.test('4. Evidence items receive stable IDs (ev-1, ev-2)', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      const res = await investigateWorkspace(testWorkspaceId, 'token jwtSecret');
      assert.equal(res.success, true);
      assert.ok(res.evidence.length >= 1);
      res.evidence.forEach((ev, idx) => {
        assert.equal(ev.id, `ev-${idx + 1}`);
        assert.ok(ev.relevanceScore > 0);
      });
    } finally {
      process.env.GEMINI_API_KEY = originalKey;
    }
  });

  await t.test('5. Deterministic confidence calculation (HIGH vs LOW)', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      const highRes = await investigateWorkspace(testWorkspaceId, 'generateToken');
      assert.equal(highRes.confidence, 'HIGH');

      const lowRes = await investigateWorkspace(testWorkspaceId, 'unrelatedTermXyz');
      assert.equal(lowRes.confidence, 'LOW');
    } finally {
      process.env.GEMINI_API_KEY = originalKey;
    }
  });

  await t.test('6. Context size limits enforcement (maxFiles: 5, maxLines: 200, maxCharacters: 4000)', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      const res = await investigateWorkspace(testWorkspaceId, 'generateToken jwtSecret');
      assert.ok(res.retrievedContextMetadata.totalFilesRetrieved <= 5);
      assert.ok(res.retrievedContextMetadata.totalLinesRetrieved <= 200);
      assert.ok(res.retrievedContextMetadata.totalCharactersRetrieved <= 4000);
    } finally {
      process.env.GEMINI_API_KEY = originalKey;
    }
  });

  await t.test('7. Claims evidenceId validation against valid evidence items', async () => {
    // Verified via unit test structure that fallback claims map strictly to valid evidence IDs
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      const res = await investigateWorkspace(testWorkspaceId, 'generateToken');
      assert.ok(res.claims.length >= 1);
      const validIds = new Set(res.evidence.map(e => e.id));
      res.claims.forEach(c => {
        c.evidenceIds.forEach(id => {
          assert.ok(validIds.has(id));
        });
      });
    } finally {
      process.env.GEMINI_API_KEY = originalKey;
    }
  });
});
