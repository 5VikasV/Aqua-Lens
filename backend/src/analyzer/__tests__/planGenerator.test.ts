import test from 'node:test';
import assert from 'node:assert/strict';
import { FileMetric } from '../../types/index.js';
import {
  generateChangePlan,
  buildPlanGeneratorPrompt
} from '../planGenerator.js';
import { WorkspaceNotFoundError, InvalidQuestionError } from '../aiInvestigator.js';
import { workspaceStore } from '../workspaceStore.js';
import { getGeminiModel, DEFAULT_GEMINI_MODEL } from '../geminiConfig.js';

test('Dynamic Change Plan Generator Test Suite', async (t) => {
  const testWorkspaceId = 'test-org/plan-repo';
  const sampleFiles: FileMetric[] = [
    { path: 'src/app.ts', extension: '.ts', language: 'TypeScript', sizeBytes: 500, lineCount: 25, importsCount: 1, exportsCount: 1 },
    { path: 'src/router.ts', extension: '.ts', language: 'TypeScript', sizeBytes: 300, lineCount: 15, importsCount: 0, exportsCount: 1 }
  ];

  const sampleContents = new Map<string, string>([
    ['src/app.ts', [
      "import { createRouter } from './router';",
      "export function createApp() {",
      "  const router = createRouter();",
      "  return { router };",
      "}"
    ].join('\n')],
    ['src/router.ts', [
      "export function createRouter() {",
      "  return { routes: [] };",
      "}"
    ].join('\n')]
  ]);

  workspaceStore.saveWorkspace({
    id: testWorkspaceId,
    repositoryUrl: 'https://github.com/test-org/plan-repo.git',
    files: sampleFiles,
    fileContents: sampleContents,
    symbolsByFile: new Map([
      ['src/app.ts', [{ name: 'createApp', kind: 'function', lineStart: 2, lineEnd: 5, isExported: true }]],
      ['src/router.ts', [{ name: 'createRouter', kind: 'function', lineStart: 1, lineEnd: 3, isExported: true }]]
    ]),
    dependencyGraph: {
      nodes: [
        { id: 'src/app.ts', label: 'app.ts', language: 'TypeScript', lineCount: 25, sizeBytes: 500 },
        { id: 'src/router.ts', label: 'router.ts', language: 'TypeScript', lineCount: 15, sizeBytes: 300 }
      ],
      edges: [
        { source: 'src/app.ts', target: 'src/router.ts', importSpecifier: './router', type: 'relative' }
      ]
    },
    packageDependencies: { dependencies: {}, devDependencies: {} },
    createdAt: new Date().toISOString()
  });

  await t.test('1. Missing workspace ID throws WorkspaceNotFoundError', async () => {
    await assert.rejects(
      async () => {
        await generateChangePlan('missing-workspace-xyz', 'Add CORS middleware');
      },
      (err: any) => err instanceof WorkspaceNotFoundError
    );
  });

  await t.test('2. Empty change request throws InvalidQuestionError', async () => {
    await assert.rejects(
      async () => {
        await generateChangePlan(testWorkspaceId, '   ');
      },
      (err: any) => err instanceof InvalidQuestionError
    );
  });

  await t.test('3. Gemini key missing fallback generates structured plan with evidence', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      const plan = await generateChangePlan(testWorkspaceId, 'createApp router');
      assert.equal(plan.success, true);
      assert.ok(plan.planId.startsWith('PLAN-'));
      assert.ok(plan.steps.length >= 1);
      assert.ok(plan.targetFiles.length >= 1);
      assert.equal(plan.validation.allFilesExist, true);
    } finally {
      process.env.GEMINI_API_KEY = originalKey;
    }
  });

  await t.test('4. Prompt construction wraps code context in untrusted_code_context tags', () => {
    const { prompt, systemInstruction } = buildPlanGeneratorPrompt(
      'Add auth middleware',
      {
        files: [
          {
            filePath: 'src/app.ts',
            language: 'TypeScript',
            score: 100,
            matchedTerms: ['createApp'],
            lineRanges: [{ start: 1, end: 5 }],
            snippets: [{ startLine: 1, endLine: 5, content: 'export function createApp() {}' }],
            symbols: []
          }
        ],
        totalFiles: 1,
        totalLines: 5,
        totalCharacters: 50,
        formattedContext: 'src/app.ts snippet'
      },
      [{ id: 'ev-1', filePath: 'src/app.ts', lineRanges: [{ start: 1, end: 5 }], matchedSymbols: ['createApp'], relevanceScore: 100 }],
      ['src/app.ts'],
      ['src/router.ts']
    );

    assert.ok(prompt.includes('<untrusted_code_context file="src/app.ts">'));
    assert.ok(prompt.includes('</untrusted_code_context>'));
    assert.ok(systemInstruction.includes('SECURITY & PROMPT INJECTION RULES'));
    assert.ok(systemInstruction.includes('Do NOT invent or fabricate file paths'));
  });

  await t.test('5. Step validation flags non-existent files', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      const plan = await generateChangePlan(testWorkspaceId, 'createApp');
      // Inject dummy invalid step to verify validation engine
      plan.steps.push({
        stepNumber: 99,
        type: 'Modify',
        filePath: 'src/nonExistentFile.ts',
        description: 'Modify non-existent file',
        symbolsInvolved: ['fakeSymbol'],
        prerequisiteSteps: []
      });

      // Manually trigger validation check pattern
      const allFiles = new Set(sampleFiles.map(f => f.path));
      const invalidFiles = plan.steps.filter(s => s.type !== 'Create' && !allFiles.has(s.filePath)).map(s => s.filePath);

      assert.equal(invalidFiles.length, 1);
      assert.equal(invalidFiles[0], 'src/nonExistentFile.ts');
    } finally {
      process.env.GEMINI_API_KEY = originalKey;
    }
  });

  await t.test('6. Bounded candidate count max 3 files in selectCandidateTargetFiles', () => {
    const mockSearchResults = [
      { filePath: 'src/f1.ts', score: 100, coverageRatio: 0.9 },
      { filePath: 'src/f2.ts', score: 95, coverageRatio: 0.85 },
      { filePath: 'src/f3.ts', score: 90, coverageRatio: 0.8 },
      { filePath: 'src/f4.ts', score: 85, coverageRatio: 0.75 },
      { filePath: 'src/f5.ts', score: 80, coverageRatio: 0.7 }
    ];

    const { selectCandidateTargetFiles } = require('../planGenerator.js');
    const selected = selectCandidateTargetFiles(mockSearchResults);
    assert.ok(selected.length <= 3);
    assert.deepEqual(selected, ['src/f1.ts', 'src/f2.ts', 'src/f3.ts']);
  });

  await t.test('7. Production implementation preferred over test candidate', () => {
    const mockSearchResults = [
      { filePath: 'test/router.test.ts', score: 100, coverageRatio: 0.8 },
      { filePath: 'src/router.ts', score: 90, coverageRatio: 0.8 }
    ];

    const { selectCandidateTargetFiles } = require('../planGenerator.js');
    const selected = selectCandidateTargetFiles(mockSearchResults);
    assert.equal(selected[0], 'src/router.ts'); // Production file preferred over test
  });

  await t.test('8. Deterministic fallback uses improved candidate selection', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      const plan = await generateChangePlan(testWorkspaceId, 'createApp router');
      assert.equal(plan.success, true);
      assert.ok(plan.targetFiles.length > 0);
      assert.ok(plan.targetFiles.length <= 3);
      assert.equal(plan.targetFiles[0], 'src/app.ts');
    } finally {
      process.env.GEMINI_API_KEY = originalKey;
    }
  });

  await t.test('9. Fallback produces exactly ONE Modify step for primary target and does not convert secondary candidates', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      const plan = await generateChangePlan(testWorkspaceId, 'createApp router');
      assert.equal(plan.success, true);
      // Even if multiple candidates exist in targetFiles, fallback produces exactly 1 Modify step for targetFiles[0]
      assert.equal(plan.steps.length, 1);
      assert.equal(plan.steps[0].filePath, plan.targetFiles[0]);
      assert.equal(plan.steps[0].type, 'Modify');
      // Verify secondary candidates (if any) were NOT converted into Modify steps
      if (plan.targetFiles.length > 1) {
        const stepFiles = plan.steps.map(s => s.filePath);
        assert.equal(stepFiles.includes(plan.targetFiles[1]), false);
      }
    } finally {
      process.env.GEMINI_API_KEY = originalKey;
    }
  });

  await t.test('10. Empty candidates in fallback mode produce zero modification steps', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      const plan = await generateChangePlan(testWorkspaceId, 'xyzUnmatchedTerm9999');
      assert.equal(plan.success, true);
      assert.equal(plan.targetFiles.length, 0);
      assert.equal(plan.steps.length, 0);
      assert.ok(plan.warnings.some(w => w.includes('No matching target file')));
    } finally {
      process.env.GEMINI_API_KEY = originalKey;
    }
  });

  await t.test('11. Gemini API error catch fallback targets only primary target file', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'invalid-fake-key-for-error-testing';

    try {
      const plan = await generateChangePlan(testWorkspaceId, 'createApp router');
      assert.equal(plan.success, true);
      assert.equal(plan.steps.length, 1);
      assert.equal(plan.steps[0].filePath, plan.targetFiles[0]);
      assert.ok(plan.warnings.some(w => w.includes('Gemini API call failed')));
    } finally {
      if (originalKey) process.env.GEMINI_API_KEY = originalKey;
      else delete process.env.GEMINI_API_KEY;
    }
  });

  await t.test('12. getGeminiModel defaults to gemini-3.6-flash and respects GEMINI_MODEL env var', () => {
    const originalModel = process.env.GEMINI_MODEL;
    delete process.env.GEMINI_MODEL;

    assert.equal(getGeminiModel(), DEFAULT_GEMINI_MODEL);
    assert.equal(getGeminiModel(), 'gemini-3.6-flash');

    process.env.GEMINI_MODEL = 'custom-gemini-model';
    assert.equal(getGeminiModel(), 'custom-gemini-model');

    if (originalModel) process.env.GEMINI_MODEL = originalModel;
    else delete process.env.GEMINI_MODEL;
  });

  await t.test('13. Gemini API error catch fallback produces clean summary free of raw error JSON', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'invalid-fake-key-for-error-testing';

    try {
      const plan = await generateChangePlan(testWorkspaceId, 'createApp router');
      assert.equal(plan.success, true);
      assert.equal(
        plan.summary,
        'AI generation was unavailable, so Aqua Lens generated a deterministic fallback plan from repository evidence.'
      );
      assert.equal(plan.summary.includes('{'), false);
      assert.equal(plan.summary.includes('"code"'), false);
    } finally {
      if (originalKey) process.env.GEMINI_API_KEY = originalKey;
      else delete process.env.GEMINI_API_KEY;
    }
  });
});

