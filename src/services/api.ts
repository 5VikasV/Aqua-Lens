import { AnalyzeResponse, ImpactAnalysisRequest, ImpactAnalysisResult } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export async function analyzeRepositoryApi(repositoryUrl: string): Promise<AnalyzeResponse> {
  const startTime = Date.now();

  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ repositoryUrl })
    });

    const data: AnalyzeResponse = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        repository: data.repository || {
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
          analysisTimeMs: Date.now() - startTime
        },
        error: data.error || `Server responded with HTTP ${response.status}: ${response.statusText}`
      };
    }

    return data;
  } catch (error: any) {
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
        analysisTimeMs: Date.now() - startTime
      },
      error: `Cannot connect to backend server at ${API_BASE_URL}. Make sure the backend server is running.`
    };
  }
}

export async function analyzeImpactApi(request: ImpactAnalysisRequest): Promise<ImpactAnalysisResult> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze/impact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    const data: ImpactAnalysisResult = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        directDependents: [],
        indirectDependents: [],
        affectedFiles: [],
        riskLevel: 'LOW',
        statistics: { directCount: 0, indirectCount: 0, totalAffected: 0, maxDepth: 0 },
        error: data.error || `Server responded with HTTP ${response.status}: ${response.statusText}`
      };
    }

    return data;
  } catch (error: any) {
    return {
      success: false,
      directDependents: [],
      indirectDependents: [],
      affectedFiles: [],
      riskLevel: 'LOW',
      statistics: { directCount: 0, indirectCount: 0, totalAffected: 0, maxDepth: 0 },
      error: `Cannot connect to backend server at ${API_BASE_URL}. Make sure the backend server is running.`
    };
  }
}

