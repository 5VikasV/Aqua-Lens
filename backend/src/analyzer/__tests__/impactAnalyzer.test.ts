import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBlastRadius } from '../impactAnalyzer.js';
import { DependencyGraph, FileMetric } from '../../types/index.js';

test('Blast Radius / Impact Analyzer Engine Suite', async (t) => {

  const sampleFiles: FileMetric[] = [
    { path: 'src/target.ts', extension: '.ts', language: 'TypeScript', sizeBytes: 100, lineCount: 20, importsCount: 0, exportsCount: 2 },
    { path: 'src/direct1.ts', extension: '.ts', language: 'TypeScript', sizeBytes: 100, lineCount: 30, importsCount: 1, exportsCount: 1 },
    { path: 'src/direct2.ts', extension: '.ts', language: 'TypeScript', sizeBytes: 100, lineCount: 25, importsCount: 1, exportsCount: 1 },
    { path: 'src/indirect1.ts', extension: '.ts', language: 'TypeScript', sizeBytes: 100, lineCount: 40, importsCount: 1, exportsCount: 1 },
    { path: 'src/circularA.ts', extension: '.ts', language: 'TypeScript', sizeBytes: 100, lineCount: 15, importsCount: 1, exportsCount: 1 },
    { path: 'src/circularB.ts', extension: '.ts', language: 'TypeScript', sizeBytes: 100, lineCount: 15, importsCount: 1, exportsCount: 1 },
    { path: 'src/isolated.ts', extension: '.ts', language: 'TypeScript', sizeBytes: 100, lineCount: 10, importsCount: 0, exportsCount: 0 }
  ];

  await t.test('1. Direct dependency detection (depth = 1)', () => {
    const graph: DependencyGraph = {
      nodes: [
        { id: 'src/target.ts', label: 'target.ts', language: 'TypeScript', lineCount: 20, sizeBytes: 100 },
        { id: 'src/direct1.ts', label: 'direct1.ts', language: 'TypeScript', lineCount: 30, sizeBytes: 100 }
      ],
      edges: [
        { source: 'src/direct1.ts', target: 'src/target.ts', importSpecifier: './target', type: 'relative' }
      ]
    };

    const result = calculateBlastRadius(graph, sampleFiles, 'src/target.ts');

    assert.equal(result.success, true);
    assert.equal(result.statistics.directCount, 1);
    assert.equal(result.statistics.indirectCount, 0);
    assert.equal(result.statistics.totalAffected, 1);
    assert.equal(result.statistics.maxDepth, 1);
    assert.equal(result.riskLevel, 'LOW');
    assert.equal(result.directDependents[0].path, 'src/direct1.ts');
  });

  await t.test('2. Multi-level indirect dependency (depth = 1 and 2)', () => {
    // direct1 imports target; indirect1 imports direct1
    const graph: DependencyGraph = {
      nodes: [
        { id: 'src/target.ts', label: 'target.ts', language: 'TypeScript', lineCount: 20, sizeBytes: 100 },
        { id: 'src/direct1.ts', label: 'direct1.ts', language: 'TypeScript', lineCount: 30, sizeBytes: 100 },
        { id: 'src/indirect1.ts', label: 'indirect1.ts', language: 'TypeScript', lineCount: 40, sizeBytes: 100 }
      ],
      edges: [
        { source: 'src/direct1.ts', target: 'src/target.ts', importSpecifier: './target', type: 'relative' },
        { source: 'src/indirect1.ts', target: 'src/direct1.ts', importSpecifier: './direct1', type: 'relative' }
      ]
    };

    const result = calculateBlastRadius(graph, sampleFiles, 'src/target.ts');

    assert.equal(result.statistics.directCount, 1);
    assert.equal(result.statistics.indirectCount, 1);
    assert.equal(result.statistics.totalAffected, 2);
    assert.equal(result.statistics.maxDepth, 2);
    assert.equal(result.indirectDependents[0].path, 'src/indirect1.ts');
    assert.equal(result.indirectDependents[0].depth, 2);
  });

  await t.test('3. Circular dependency safety (no infinite loop)', () => {
    // target <- circularA <-> circularB
    const graph: DependencyGraph = {
      nodes: [],
      edges: [
        { source: 'src/circularA.ts', target: 'src/target.ts', importSpecifier: './target', type: 'relative' },
        { source: 'src/circularB.ts', target: 'src/circularA.ts', importSpecifier: './circularA', type: 'relative' },
        { source: 'src/circularA.ts', target: 'src/circularB.ts', importSpecifier: './circularB', type: 'relative' }
      ]
    };

    const result = calculateBlastRadius(graph, sampleFiles, 'src/target.ts');

    assert.equal(result.success, true);
    assert.equal(result.statistics.totalAffected, 2);
    assert.ok(!result.affectedFiles.some(f => f.path === 'src/target.ts'));
  });

  await t.test('4. Isolated file (0 affected files)', () => {
    const graph: DependencyGraph = { nodes: [], edges: [] };
    const result = calculateBlastRadius(graph, sampleFiles, 'src/isolated.ts');

    assert.equal(result.success, true);
    assert.equal(result.statistics.totalAffected, 0);
    assert.equal(result.statistics.maxDepth, 0);
    assert.equal(result.riskLevel, 'LOW');
  });

  await t.test('5. Multiple paths to same dependent (shortest depth preserved)', () => {
    // Path 1: target <- direct1 <- indirect1 (depth 2)
    // Path 2: target <- indirect1 (direct import, depth 1)
    const graph: DependencyGraph = {
      nodes: [],
      edges: [
        { source: 'src/direct1.ts', target: 'src/target.ts', importSpecifier: './target', type: 'relative' },
        { source: 'src/indirect1.ts', target: 'src/direct1.ts', importSpecifier: './direct1', type: 'relative' },
        { source: 'src/indirect1.ts', target: 'src/target.ts', importSpecifier: './target', type: 'relative' }
      ]
    };

    const result = calculateBlastRadius(graph, sampleFiles, 'src/target.ts');

    const indirectItem = result.affectedFiles.find(f => f.path === 'src/indirect1.ts');
    assert.ok(indirectItem);
    assert.equal(indirectItem.depth, 1); // Preserves shortest depth 1
  });

  await t.test('6. External package edge ignoring', () => {
    const graph: DependencyGraph = {
      nodes: [],
      edges: [
        { source: 'src/target.ts', target: 'express', importSpecifier: 'express', type: 'package' },
        { source: 'src/direct1.ts', target: 'src/target.ts', importSpecifier: './target', type: 'relative' }
      ]
    };

    const result = calculateBlastRadius(graph, sampleFiles, 'src/target.ts');

    assert.equal(result.statistics.totalAffected, 1);
    assert.ok(!result.affectedFiles.some(f => f.path === 'express'));
  });

  await t.test('7. Target file not found in workspace', () => {
    const graph: DependencyGraph = { nodes: [], edges: [] };
    const result = calculateBlastRadius(graph, sampleFiles, 'src/nonexistent.ts');

    assert.equal(result.success, false);
    assert.ok(result.error?.includes('does not exist'));
  });

});
