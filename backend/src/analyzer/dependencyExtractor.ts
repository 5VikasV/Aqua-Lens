import * as path from 'path';
import { DependencyEdge, DependencyGraph, DependencyNode, FileMetric } from '../types/index.js';
import { jsParser } from './parsers/jsParser.js';
import { pythonParser } from './parsers/pythonParser.js';
import { goParser } from './parsers/goParser.js';
import { LanguageParser } from './parsers/types.js';

export interface ExtractionResult {
  graph: DependencyGraph;
  updatedFiles: FileMetric[];
  internalDependenciesCount: number;
  externalDependenciesCount: number;
  unresolvedImportsCount: number;
  parseFailuresCount: number;
  duplicateEdgesRemoved: number;
}

const parsersByExtension: Record<string, LanguageParser> = {};

for (const ext of jsParser.supportedExtensions) {
  parsersByExtension[ext] = jsParser;
}
for (const ext of pythonParser.supportedExtensions) {
  parsersByExtension[ext] = pythonParser;
}
for (const ext of goParser.supportedExtensions) {
  parsersByExtension[ext] = goParser;
}

export function extractDependencies(
  files: FileMetric[],
  fileContents: Map<string, string>
): ExtractionResult {
  const nodes: DependencyNode[] = [];
  const edges: DependencyEdge[] = [];
  const fileMap = new Map<string, FileMetric>();

  let internalDependenciesCount = 0;
  let externalDependenciesCount = 0;
  let unresolvedImportsCount = 0;
  let parseFailuresCount = 0;
  let duplicateEdgesRemoved = 0;

  for (const file of files) {
    fileMap.set(file.path, file);
    nodes.push({
      id: file.path,
      label: path.basename(file.path),
      language: file.language,
      lineCount: file.lineCount,
      sizeBytes: file.sizeBytes
    });
  }

  const updatedFiles = files.map(file => ({ ...file }));
  const edgeSet = new Set<string>();

  for (let i = 0; i < updatedFiles.length; i++) {
    const file = updatedFiles[i];
    const content = fileContents.get(file.path);
    if (!content) continue;

    const ext = file.extension.toLowerCase();
    const parser = parsersByExtension[ext];

    if (!parser) continue;

    file.parserType = parser.parserType;

    let parseResult;
    try {
      parseResult = parser.parse(content, file.path);
    } catch (e) {
      parseFailuresCount++;
      file.hasParseError = true;
      continue;
    }

    if (parseResult.hasParseError) {
      parseFailuresCount++;
      file.hasParseError = true;
    }

    file.importsCount = parseResult.imports.length;
    file.exportsCount = parseResult.exportsCount;

    for (const imp of parseResult.imports) {
      const specifier = imp.specifier;

      if (imp.isRelative || specifier.startsWith('.')) {
        const dir = path.dirname(file.path);
        const resolvedBase = path.normalize(path.join(dir, specifier)).replace(/\\/g, '/');

        const possiblePaths = [
          resolvedBase,
          `${resolvedBase}.ts`,
          `${resolvedBase}.tsx`,
          `${resolvedBase}.js`,
          `${resolvedBase}.jsx`,
          `${resolvedBase}.mjs`,
          `${resolvedBase}.cjs`,
          `${resolvedBase}.d.ts`,
          `${resolvedBase}.py`,
          `${resolvedBase}.go`,
          `${resolvedBase}/index.ts`,
          `${resolvedBase}/index.tsx`,
          `${resolvedBase}/index.js`,
          `${resolvedBase}/index.jsx`,
          `${resolvedBase}/__init__.py`
        ];

        const targetPath = possiblePaths.find(p => fileMap.has(p));

        if (targetPath) {
          const edgeKey = `${file.path}->${targetPath}`;
          if (edgeSet.has(edgeKey)) {
            duplicateEdgesRemoved++;
          } else {
            edgeSet.add(edgeKey);
            internalDependenciesCount++;
            edges.push({
              source: file.path,
              target: targetPath,
              importSpecifier: specifier,
              type: 'relative'
            });
          }
        } else {
          unresolvedImportsCount++;
        }
      } else {
        const edgeKey = `${file.path}->pkg:${specifier}`;
        if (edgeSet.has(edgeKey)) {
          duplicateEdgesRemoved++;
        } else {
          edgeSet.add(edgeKey);
          externalDependenciesCount++;
          edges.push({
            source: file.path,
            target: specifier,
            importSpecifier: specifier,
            type: 'package'
          });
        }
      }
    }
  }

  return {
    graph: {
      nodes,
      edges
    },
    updatedFiles,
    internalDependenciesCount,
    externalDependenciesCount,
    unresolvedImportsCount,
    parseFailuresCount,
    duplicateEdgesRemoved
  };
}
