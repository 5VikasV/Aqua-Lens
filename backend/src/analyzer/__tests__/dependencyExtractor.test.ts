import test from 'node:test';
import assert from 'node:assert/strict';
import { extractDependencies } from '../dependencyExtractor.js';
import { FileMetric } from '../../types/index.js';

test('AST Dependency Extraction Suite', async (t) => {

  await t.test('1. ESM imports extraction', () => {
    const files: FileMetric[] = [
      { path: 'src/main.ts', extension: '.ts', language: 'TypeScript', sizeBytes: 100, lineCount: 10, importsCount: 0, exportsCount: 0 },
      { path: 'src/utils.ts', extension: '.ts', language: 'TypeScript', sizeBytes: 100, lineCount: 10, importsCount: 0, exportsCount: 0 }
    ];

    const fileContents = new Map<string, string>([
      ['src/main.ts', `import { helper } from './utils';\nimport express from 'express';`],
      ['src/utils.ts', `export function helper() { return 'ok'; }`]
    ]);

    const result = extractDependencies(files, fileContents);

    assert.equal(result.graph.edges.length, 2);
    
    const relativeEdge = result.graph.edges.find(e => e.type === 'relative');
    assert.ok(relativeEdge);
    assert.equal(relativeEdge.source, 'src/main.ts');
    assert.equal(relativeEdge.target, 'src/utils.ts');
    assert.equal(relativeEdge.importSpecifier, './utils');

    const pkgEdge = result.graph.edges.find(e => e.type === 'package');
    assert.ok(pkgEdge);
    assert.equal(pkgEdge.target, 'express');
  });

  await t.test('2. CommonJS require extraction', () => {
    const files: FileMetric[] = [
      { path: 'index.js', extension: '.js', language: 'JavaScript', sizeBytes: 100, lineCount: 10, importsCount: 0, exportsCount: 0 },
      { path: 'lib/db.js', extension: '.js', language: 'JavaScript', sizeBytes: 100, lineCount: 10, importsCount: 0, exportsCount: 0 }
    ];

    const fileContents = new Map<string, string>([
      ['index.js', `const db = require('./lib/db');\nconst cors = require('cors');`],
      ['lib/db.js', `module.exports = { connect: () => {} };`]
    ]);

    const result = extractDependencies(files, fileContents);

    const relativeEdge = result.graph.edges.find(e => e.type === 'relative');
    assert.ok(relativeEdge);
    assert.equal(relativeEdge.source, 'index.js');
    assert.equal(relativeEdge.target, 'lib/db.js');
  });

  await t.test('3. Extensionless imports resolution', () => {
    const files: FileMetric[] = [
      { path: 'src/app.ts', extension: '.ts', language: 'TypeScript', sizeBytes: 100, lineCount: 10, importsCount: 0, exportsCount: 0 },
      { path: 'src/config.tsx', extension: '.tsx', language: 'TypeScript', sizeBytes: 100, lineCount: 10, importsCount: 0, exportsCount: 0 }
    ];

    const fileContents = new Map<string, string>([
      ['src/app.ts', `import { config } from './config';`],
      ['src/config.tsx', `export const config = {};`]
    ]);

    const result = extractDependencies(files, fileContents);

    const edge = result.graph.edges.find(e => e.type === 'relative');
    assert.ok(edge);
    assert.equal(edge.target, 'src/config.tsx');
  });

  await t.test('4. Index file resolution', () => {
    const files: FileMetric[] = [
      { path: 'src/app.ts', extension: '.ts', language: 'TypeScript', sizeBytes: 100, lineCount: 10, importsCount: 0, exportsCount: 0 },
      { path: 'src/components/index.ts', extension: '.ts', language: 'TypeScript', sizeBytes: 100, lineCount: 10, importsCount: 0, exportsCount: 0 }
    ];

    const fileContents = new Map<string, string>([
      ['src/app.ts', `import { Button } from './components';`],
      ['src/components/index.ts', `export const Button = () => {};`]
    ]);

    const result = extractDependencies(files, fileContents);

    const edge = result.graph.edges.find(e => e.type === 'relative');
    assert.ok(edge);
    assert.equal(edge.target, 'src/components/index.ts');
  });

  await t.test('5. Duplicate imports deduplication', () => {
    const files: FileMetric[] = [
      { path: 'src/app.ts', extension: '.ts', language: 'TypeScript', sizeBytes: 100, lineCount: 10, importsCount: 0, exportsCount: 0 },
      { path: 'src/utils.ts', extension: '.ts', language: 'TypeScript', sizeBytes: 100, lineCount: 10, importsCount: 0, exportsCount: 0 }
    ];

    const fileContents = new Map<string, string>([
      ['src/app.ts', `import { a } from './utils';\nimport { b } from './utils';\nimport { c } from './utils';`],
      ['src/utils.ts', `export const a = 1; export const b = 2; export const c = 3;`]
    ]);

    const result = extractDependencies(files, fileContents);

    const relativeEdges = result.graph.edges.filter(e => e.type === 'relative');
    assert.equal(relativeEdges.length, 1);
    assert.ok(result.duplicateEdgesRemoved >= 2);
  });

  await t.test('6. Malformed source files syntax error tolerance', () => {
    const files: FileMetric[] = [
      { path: 'src/broken.ts', extension: '.ts', language: 'TypeScript', sizeBytes: 100, lineCount: 10, importsCount: 0, exportsCount: 0 },
      { path: 'src/valid.ts', extension: '.ts', language: 'TypeScript', sizeBytes: 100, lineCount: 10, importsCount: 0, exportsCount: 0 }
    ];

    const fileContents = new Map<string, string>([
      ['src/broken.ts', `import { x } from './valid';\nconst invalid code syntax {{{ {{`],
      ['src/valid.ts', `export const x = 42;`]
    ]);

    const result = extractDependencies(files, fileContents);

    // Parse failure logged, but analysis completed without throwing
    assert.ok(result.parseFailuresCount >= 1);
    const edge = result.graph.edges.find(e => e.type === 'relative');
    assert.ok(edge);
    assert.equal(edge.source, 'src/broken.ts');
    assert.equal(edge.target, 'src/valid.ts');
  });

  await t.test('7. Circular dependencies graph preservation', () => {
    const files: FileMetric[] = [
      { path: 'src/moduleA.ts', extension: '.ts', language: 'TypeScript', sizeBytes: 100, lineCount: 10, importsCount: 0, exportsCount: 0 },
      { path: 'src/moduleB.ts', extension: '.ts', language: 'TypeScript', sizeBytes: 100, lineCount: 10, importsCount: 0, exportsCount: 0 }
    ];

    const fileContents = new Map<string, string>([
      ['src/moduleA.ts', `import { b } from './moduleB';\nexport const a = 1;`],
      ['src/moduleB.ts', `import { a } from './moduleA';\nexport const b = 2;`]
    ]);

    const result = extractDependencies(files, fileContents);

    assert.equal(result.graph.edges.length, 2);
    const edgeA = result.graph.edges.find(e => e.source === 'src/moduleA.ts' && e.target === 'src/moduleB.ts');
    const edgeB = result.graph.edges.find(e => e.source === 'src/moduleB.ts' && e.target === 'src/moduleA.ts');
    assert.ok(edgeA);
    assert.ok(edgeB);
  });
});
