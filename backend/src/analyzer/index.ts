import { validateGitHubUrl } from './urlValidator.js';
import { cloneRepository } from './gitCloner.js';
import { scanRepositoryFiles } from './fileScanner.js';
import { extractDependencies } from './dependencyExtractor.js';
import { extractSymbols } from './symbolExtractor.js';
import { workspaceStore } from './workspaceStore.js';
import { searchCode } from './codeSearch.js';
import { buildRetrievalContext } from './contextBuilder.js';
import { AnalyzeResponse, ExtractedSymbol } from '../types/index.js';

export * from './symbolExtractor.js';
export * from './codeSearch.js';
export * from './contextBuilder.js';
export * from './workspaceStore.js';
export * from './aiInvestigator.js';

export async function analyzeRepository(repositoryUrl: string): Promise<AnalyzeResponse> {
  const startTime = Date.now();

  // 1. Validate GitHub URL
  const validation = validateGitHubUrl(repositoryUrl);
  if (!validation.isValid) {
    return {
      success: false,
      repository: {
        url: repositoryUrl,
        owner: '',
        name: '',
        clonedAt: new Date().toISOString()
      },
      languages: [],
      fileCount: 0,
      dependencyCount: 0,
      files: [],
      dependencyGraph: { nodes: [], edges: [] },
      packageDependencies: { dependencies: {}, devDependencies: {} },
      metrics: {
        totalFilesScanned: 0,
        totalFilesIgnored: 0,
        totalLinesOfCode: 0,
        totalSizeBytes: 0,
        totalDependencies: 0,
        internalDependenciesCount: 0,
        externalDependenciesCount: 0,
        unresolvedImportsCount: 0,
        parseFailuresCount: 0,
        duplicateEdgesRemoved: 0,
        analysisTimeMs: Date.now() - startTime
      },
      error: validation.error || 'Invalid repository URL'
    };
  }

  // 2. Clone Repository safely into temporary workspace
  let cloneResult;
  try {
    cloneResult = await cloneRepository(validation.normalizedUrl);
  } catch (cloneErr: any) {
    return {
      success: false,
      repository: {
        url: validation.normalizedUrl,
        owner: validation.owner,
        name: validation.repoName,
        clonedAt: new Date().toISOString()
      },
      languages: [],
      fileCount: 0,
      dependencyCount: 0,
      files: [],
      dependencyGraph: { nodes: [], edges: [] },
      packageDependencies: { dependencies: {}, devDependencies: {} },
      metrics: {
        totalFilesScanned: 0,
        totalFilesIgnored: 0,
        totalLinesOfCode: 0,
        totalSizeBytes: 0,
        totalDependencies: 0,
        internalDependenciesCount: 0,
        externalDependenciesCount: 0,
        unresolvedImportsCount: 0,
        parseFailuresCount: 0,
        duplicateEdgesRemoved: 0,
        analysisTimeMs: Date.now() - startTime
      },
      error: cloneErr.message || 'Failed to clone repository'
    };
  }

  try {
    // 3. Scan directory and extract file metrics
    const scan = await scanRepositoryFiles(cloneResult.targetPath);

    // 4. Extract dependencies using AST and structured language parsers
    const {
      graph,
      updatedFiles,
      internalDependenciesCount,
      externalDependenciesCount,
      unresolvedImportsCount,
      parseFailuresCount,
      duplicateEdgesRemoved
    } = extractDependencies(scan.files, scan.fileContents);

    const totalDependenciesCount = graph.edges.length +
      Object.keys(scan.packageDependencies.dependencies || {}).length +
      Object.keys(scan.packageDependencies.devDependencies || {}).length;

    // 5. Extract AST symbols and build AnalysisWorkspace for lifetime retention
    const symbolsByFile = new Map<string, ExtractedSymbol[]>();
    for (const [filePath, content] of scan.fileContents.entries()) {
      symbolsByFile.set(filePath, extractSymbols(content, filePath));
    }

    const workspaceId = `${validation.owner}/${validation.repoName}`;
    workspaceStore.saveWorkspace({
      id: workspaceId,
      repositoryUrl: validation.normalizedUrl,
      files: updatedFiles,
      fileContents: scan.fileContents,
      symbolsByFile,
      dependencyGraph: graph,
      packageDependencies: scan.packageDependencies,
      createdAt: new Date().toISOString()
    });

    const analysisTimeMs = Date.now() - startTime;

    return {
      success: true,
      repository: {
        url: validation.normalizedUrl,
        owner: validation.owner,
        name: validation.repoName,
        clonedAt: new Date().toISOString()
      },
      languages: scan.languages,
      fileCount: updatedFiles.length,
      dependencyCount: totalDependenciesCount,
      files: updatedFiles,
      dependencyGraph: graph,
      packageDependencies: scan.packageDependencies,
      metrics: {
        totalFilesScanned: scan.totalScanned,
        totalFilesIgnored: scan.totalIgnored,
        totalLinesOfCode: scan.totalLines,
        totalSizeBytes: scan.totalBytes,
        totalDependencies: totalDependenciesCount,
        internalDependenciesCount,
        externalDependenciesCount,
        unresolvedImportsCount,
        parseFailuresCount,
        duplicateEdgesRemoved,
        analysisTimeMs
      }
    };

  } catch (analysisErr: any) {
    return {
      success: false,
      repository: {
        url: validation.normalizedUrl,
        owner: validation.owner,
        name: validation.repoName,
        clonedAt: new Date().toISOString()
      },
      languages: [],
      fileCount: 0,
      dependencyCount: 0,
      files: [],
      dependencyGraph: { nodes: [], edges: [] },
      packageDependencies: { dependencies: {}, devDependencies: {} },
      metrics: {
        totalFilesScanned: 0,
        totalFilesIgnored: 0,
        totalLinesOfCode: 0,
        totalSizeBytes: 0,
        totalDependencies: 0,
        internalDependenciesCount: 0,
        externalDependenciesCount: 0,
        unresolvedImportsCount: 0,
        parseFailuresCount: 0,
        duplicateEdgesRemoved: 0,
        analysisTimeMs: Date.now() - startTime
      },
      error: analysisErr.message || 'An error occurred during repository analysis'
    };
  } finally {
    // 6. Cleanup temporary cloned repository files on disk
    if (cloneResult && cloneResult.cleanup) {
      await cloneResult.cleanup();
    }
  }
}

