import * as path from 'path';
import {
  DependencyGraph,
  FileMetric,
  ImpactAffectedFile,
  ImpactAnalysisResult,
  ImpactDependentFile,
  ImpactRiskLevel,
  ImpactTargetInfo
} from '../types/index.js';

export function calculateBlastRadius(
  graph: DependencyGraph,
  files: FileMetric[],
  targetPath: string
): ImpactAnalysisResult {
  const normalizedTarget = path.normalize(targetPath).replace(/\\/g, '/');

  const fileMap = new Map<string, FileMetric>();
  for (const f of files) {
    fileMap.set(f.path, f);
  }

  // Find target file metric
  const targetFile = fileMap.get(normalizedTarget) ||
    files.find(f => f.path.toLowerCase() === normalizedTarget.toLowerCase());

  if (!targetFile) {
    return {
      success: false,
      directDependents: [],
      indirectDependents: [],
      affectedFiles: [],
      riskLevel: 'LOW',
      statistics: { directCount: 0, indirectCount: 0, totalAffected: 0, maxDepth: 0 },
      error: `Target file '${targetPath}' does not exist in the analyzed repository.`
    };
  }

  const targetInfo: ImpactTargetInfo = {
    path: targetFile.path,
    language: targetFile.language,
    lineCount: targetFile.lineCount,
    sizeBytes: targetFile.sizeBytes
  };

  // Build reverse adjacency list for relative internal dependencies
  // If A imports B (source=A, target=B), then reverseAdj[B] contains A
  const reverseAdj = new Map<string, Array<{ source: string; importSpecifier: string }>>();

  for (const edge of graph.edges) {
    if (edge.type === 'relative') {
      const dependents = reverseAdj.get(edge.target) || [];
      dependents.push({ source: edge.source, importSpecifier: edge.importSpecifier });
      reverseAdj.set(edge.target, dependents);
    }
  }

  // Map storing shortest depth and import specifier for visited dependents
  const visited = new Map<string, { depth: number; importSpecifier: string }>();

  // Queue for BFS traversal
  const queue: Array<{ path: string; depth: number }> = [{ path: targetInfo.path, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const dependents = reverseAdj.get(current.path) || [];

    for (const dep of dependents) {
      const depPath = dep.source;

      // Do not include target file itself in affected list
      if (depPath === targetInfo.path) continue;

      const nextDepth = current.depth + 1;
      const existing = visited.get(depPath);

      // Store shortest depth
      if (!existing || nextDepth < existing.depth) {
        visited.set(depPath, { depth: nextDepth, importSpecifier: dep.importSpecifier });
        queue.push({ path: depPath, depth: nextDepth });
      }
    }
  }

  const directDependents: ImpactDependentFile[] = [];
  const indirectDependents: ImpactDependentFile[] = [];
  const affectedFiles: ImpactAffectedFile[] = [];

  let maxDepth = 0;

  // Convert visited map into structured outputs
  const sortedEntries = Array.from(visited.entries()).sort((a, b) => {
    if (a[1].depth !== b[1].depth) return a[1].depth - b[1].depth;
    return a[0].localeCompare(b[0]);
  });

  for (const [depPath, info] of sortedEntries) {
    const metric = fileMap.get(depPath);
    const isDirect = info.depth === 1;

    if (info.depth > maxDepth) {
      maxDepth = info.depth;
    }

    const dependentItem: ImpactDependentFile = {
      path: depPath,
      importSpecifier: info.importSpecifier,
      depth: info.depth
    };

    if (isDirect) {
      directDependents.push(dependentItem);
    } else {
      indirectDependents.push(dependentItem);
    }

    affectedFiles.push({
      path: depPath,
      depth: info.depth,
      isDirect,
      language: metric?.language || 'Code',
      lineCount: metric?.lineCount || 0
    });
  }

  const totalAffected = affectedFiles.length;

  // Risk Classification Heuristics
  let riskLevel: ImpactRiskLevel = 'LOW';
  if (totalAffected >= 51) {
    riskLevel = 'CRITICAL';
  } else if (totalAffected >= 21) {
    riskLevel = 'HIGH';
  } else if (totalAffected >= 6) {
    riskLevel = 'MEDIUM';
  } else {
    riskLevel = 'LOW';
  }

  return {
    success: true,
    target: targetInfo,
    directDependents,
    indirectDependents,
    affectedFiles,
    riskLevel,
    statistics: {
      directCount: directDependents.length,
      indirectCount: indirectDependents.length,
      totalAffected,
      maxDepth
    }
  };
}
