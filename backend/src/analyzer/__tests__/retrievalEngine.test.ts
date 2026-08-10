import test from 'node:test';
import assert from 'node:assert/strict';
import { FileMetric } from '../../types/index.js';
import { extractSymbols } from '../symbolExtractor.js';
import { searchCode, tokenizeQuery, SearchableWorkspace } from '../codeSearch.js';
import { buildRetrievalContext } from '../contextBuilder.js';

test('Code Retrieval & Context Engine v2 Test Suite', async (t) => {
  const sampleFiles: FileMetric[] = [
    { path: 'lib/express.js', extension: '.js', language: 'JavaScript', sizeBytes: 500, lineCount: 20, importsCount: 1, exportsCount: 1 },
    { path: 'lib/application.js', extension: '.js', language: 'JavaScript', sizeBytes: 1200, lineCount: 60, importsCount: 2, exportsCount: 1 },
    { path: 'lib/router/index.js', extension: '.js', language: 'JavaScript', sizeBytes: 1500, lineCount: 80, importsCount: 3, exportsCount: 1 },
    { path: 'History.md', extension: '.md', language: 'Markdown', sizeBytes: 5000, lineCount: 500, importsCount: 0, exportsCount: 0 },
    { path: 'docs/routing.md', extension: '.md', language: 'Markdown', sizeBytes: 800, lineCount: 40, importsCount: 0, exportsCount: 0 },
    { path: 'test/app.router.js', extension: '.js', language: 'JavaScript', sizeBytes: 900, lineCount: 45, importsCount: 1, exportsCount: 0 }
  ];

  const sampleContents = new Map<string, string>([
    ['lib/express.js', [
      "var EventEmitter = require('events').EventEmitter;",
      "var mixin = require('merge-descriptors');",
      "var proto = require('./application');",
      "exports = module.exports = createApplication;",
      "function createApplication() {",
      "  var app = function(req, res, next) { app.handle(req, res, next); };",
      "  mixin(app, EventEmitter.prototype, false);",
      "  mixin(app, proto, false);",
      "  return app;",
      "}"
    ].join('\n')],
    ['lib/application.js', [
      "var Router = require('./router');",
      "var app = exports = module.exports = {};",
      "app.init = function init() { this.cache = {}; };",
      "app.lazyrouter = function lazyrouter() { if (!this._router) { this._router = new Router(); } };",
      "app.handle = function handle(req, res, callback) {",
      "  var router = this._router;",
      "  router.handle(req, res, callback);",
      "}"
    ].join('\n')],
    ['lib/router/index.js', [
      "var Route = require('./route');",
      "function Router(options) {",
      "  var self = function(req, res, next) { self.handle(req, res, next); };",
      "  return self;",
      "}",
      "Router.prototype.handle = function handle(req, res, out) {",
      "  // Core routing implementation engine",
      "  var idx = 0;",
      "};",
      "module.exports = Router;"
    ].join('\n')],
    ['History.md', [
      "# Release History",
      "## 5.0.0",
      "- Added routing updates for application creation.",
      "- How does Express create an application? Fixed bug in app routing.",
      "- Fixed requests handling in application router.",
      "- repeated keyword application application application application application"
    ].join('\n')],
    ['docs/routing.md', [
      "# Routing Documentation",
      "This document explains where routing is implemented in the codebase."
    ].join('\n')],
    ['test/app.router.js', [
      "var express = require('../');",
      "describe('app.router', function() {",
      "  it('should handle requests', function(done) {",
      "    var app = express();",
      "    app.get('/', function(req, res) { res.send('ok'); });",
      "  });",
      "});"
    ].join('\n')]
  ]);

  const workspace: SearchableWorkspace = {
    files: sampleFiles,
    fileContents: sampleContents
  };

  await t.test('1. Stopword filtering verification', () => {
    const { filteredTerms } = tokenizeQuery('How does Express create an application?');
    assert.deepEqual(filteredTerms, ['express', 'create', 'application']);
    assert.ok(!filteredTerms.includes('how'));
    assert.ok(!filteredTerms.includes('does'));
    assert.ok(!filteredTerms.includes('an'));
  });

  await t.test('2. History.md penalty vs implementation file outranking', () => {
    const results = searchCode(workspace, 'How does Express create an application?');
    assert.ok(results.length >= 2);
    assert.equal(results[0].filePath, 'lib/express.js'); // lib/express.js outranks History.md
    assert.ok(results[0].score > results.find(r => r.filePath === 'History.md')!.score);
  });

  await t.test('3. Implementation files outrank docs for implementation questions', () => {
    const results = searchCode(workspace, 'Where is routing implemented?');
    assert.ok(results.length >= 2);
    const topPath = results[0].filePath;
    assert.ok(topPath === 'lib/router/index.js' || topPath === 'lib/application.js');
    const docResult = results.find(r => r.filePath === 'docs/routing.md');
    assert.ok(docResult);
    assert.ok(results[0].score > docResult.score);
  });

  await t.test('4. Exact symbol beats repeated keyword frequency', () => {
    const results = searchCode(workspace, 'createApplication');
    assert.ok(results.length >= 1);
    assert.equal(results[0].filePath, 'lib/express.js');
    assert.ok(results[0].matchedTerms.includes('createApplication'));
  });

  await t.test('5. Tests remain discoverable but receive test penalty', () => {
    const results = searchCode(workspace, 'handle requests');
    const testResult = results.find(r => r.filePath === 'test/app.router.js');
    const implResult = results.find(r => r.filePath === 'lib/application.js' || r.filePath === 'lib/router/index.js');
    assert.ok(testResult);
    assert.ok(implResult);
    assert.ok(implResult.score > testResult.score);
  });

  await t.test('6. Diminishing returns / capped score for repeated terms', () => {
    const repeatedWorkspace: SearchableWorkspace = {
      files: [
        { path: 'src/single_symbol.ts', extension: '.ts', language: 'TypeScript', sizeBytes: 100, lineCount: 5, importsCount: 0, exportsCount: 1 },
        { path: 'docs/repeated_text.md', extension: '.md', language: 'Markdown', sizeBytes: 1000, lineCount: 100, importsCount: 0, exportsCount: 0 }
      ],
      fileContents: new Map([
        ['src/single_symbol.ts', 'export function targetFunction() { return 1; }'],
        ['docs/repeated_text.md', Array(50).fill('targetFunction targetFunction targetFunction').join('\n')]
      ])
    };

    const results = searchCode(repeatedWorkspace, 'targetFunction');
    assert.equal(results[0].filePath, 'src/single_symbol.ts');
  });

  await t.test('7. "Where is routing implemented?" ranks routing implementation files highly', () => {
    const results = searchCode(workspace, 'Where is routing implemented?');
    assert.ok(results.length > 0);
    assert.ok(results[0].filePath.includes('router') || results[0].filePath.includes('application'));
  });

  await t.test('8. "How does Express create an application?" ranks lib/express.js appropriately', () => {
    const results = searchCode(workspace, 'How does Express create an application?');
    assert.ok(results.length > 0);
    assert.equal(results[0].filePath, 'lib/express.js');
  });

  await t.test('9. "How does Express handle requests?" ranks relevant application/request/router implementation files', () => {
    const results = searchCode(workspace, 'How does Express handle requests?');
    assert.ok(results.length > 0);
    assert.ok(results[0].filePath.startsWith('lib/'));
  });

  await t.test('10. Context limits enforcement', () => {
    const results = searchCode(workspace, 'routing');
    const ctx = buildRetrievalContext(results, { maxFiles: 2, maxLines: 10 });
    assert.ok(ctx.totalFiles <= 2);
    assert.ok(ctx.totalLines <= 10);
  });

  await t.test('11. Regression: highly relevant test + weak production match', () => {
    const testWs: SearchableWorkspace = {
      files: [
        { path: 'src/unrelated.ts', extension: '.ts', language: 'TypeScript', sizeBytes: 100, lineCount: 10, importsCount: 0, exportsCount: 0 },
        { path: 'test/customFeature.test.ts', extension: '.ts', language: 'TypeScript', sizeBytes: 200, lineCount: 20, importsCount: 1, exportsCount: 0 }
      ],
      fileContents: new Map([
        ['src/unrelated.ts', 'export function genericHelper() { return true; } // weak match: feature'],
        ['test/customFeature.test.ts', 'import { customFeature } from "../src"; describe("customFeature", () => { it("should work", () => { customFeature(); }); });']
      ])
    };

    const results = searchCode(testWs, 'where is customFeature implemented?');
    assert.ok(results.length >= 1);
    assert.equal(results[0].filePath, 'test/customFeature.test.ts'); // Highly relevant test outranks weak production match
  });

  await t.test('12. Regression: relevant production implementation + relevant test', () => {
    const testWs: SearchableWorkspace = {
      files: [
        { path: 'src/customFeature.ts', extension: '.ts', language: 'TypeScript', sizeBytes: 150, lineCount: 15, importsCount: 0, exportsCount: 1 },
        { path: 'test/customFeature.test.ts', extension: '.ts', language: 'TypeScript', sizeBytes: 150, lineCount: 15, importsCount: 1, exportsCount: 0 }
      ],
      fileContents: new Map([
        ['src/customFeature.ts', 'export function customFeature() { return "implemented"; }'],
        ['test/customFeature.test.ts', 'import { customFeature } from "../src/customFeature"; describe("customFeature", () => { customFeature(); });']
      ])
    };

    const results = searchCode(testWs, 'where is customFeature implemented?');
    assert.ok(results.length >= 2);
    assert.equal(results[0].filePath, 'src/customFeature.ts'); // Production implementation outranks comparable test
    assert.equal(results[1].filePath, 'test/customFeature.test.ts');
  });

  await t.test('13. Regression: implementation query with only test evidence', () => {
    const testWs: SearchableWorkspace = {
      files: [
        { path: 'test/onlyTestEvidence.test.ts', extension: '.ts', language: 'TypeScript', sizeBytes: 100, lineCount: 10, importsCount: 0, exportsCount: 0 }
      ],
      fileContents: new Map([
        ['test/onlyTestEvidence.test.ts', 'describe("isolatedTestOnlyFeature", () => { isolatedTestOnlyFeature(); });']
      ])
    };

    const results = searchCode(testWs, 'where is isolatedTestOnlyFeature implemented?');
    assert.equal(results.length, 1);
    assert.equal(results[0].filePath, 'test/onlyTestEvidence.test.ts'); // Test evidence returned when no production files exist
  });
});

