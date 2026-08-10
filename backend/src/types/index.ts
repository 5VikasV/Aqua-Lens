export interface AnalyzeRequest {
  repositoryUrl: string;
}

export interface RepositoryInfo {
  url: string;
  owner: string;
  name: string;
  clonedAt: string;
}

export interface FileMetric {
  path: string;
  extension: string;
  language: string;
  sizeBytes: number;
  lineCount: number;
  importsCount: number;
  exportsCount: number;
  parserType?: 'ast' | 'lexical';
  hasParseError?: boolean;
}

export interface DependencyNode {
  id: string;
  label: string;
  language: string;
  lineCount: number;
  sizeBytes: number;
}

export interface DependencyEdge {
  source: string;
  target: string;
  importSpecifier: string;
  type: 'relative' | 'package';
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

export interface PackageDependencies {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export interface LanguageMetric {
  language: string;
  fileCount: number;
  lineCount: number;
  percentage: number;
}

export interface AnalysisSummary {
  totalFilesScanned: number;
  totalFilesIgnored: number;
  totalLinesOfCode: number;
  totalSizeBytes: number;
  totalDependencies: number;
  internalDependenciesCount: number;
  externalDependenciesCount: number;
  unresolvedImportsCount: number;
  parseFailuresCount: number;
  duplicateEdgesRemoved: number;
  analysisTimeMs: number;
}

export interface AnalyzeResponse {
  success: boolean;
  repository: RepositoryInfo;
  languages: LanguageMetric[];
  fileCount: number;
  dependencyCount: number;
  files: FileMetric[];
  dependencyGraph: DependencyGraph;
  packageDependencies: PackageDependencies;
  metrics: AnalysisSummary;
  error?: string;
}

// Impact / Blast Radius Analysis Types
export type ImpactRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ImpactTargetInfo {
  path: string;
  language: string;
  lineCount: number;
  sizeBytes: number;
}

export interface ImpactDependentFile {
  path: string;
  importSpecifier: string;
  depth: number;
}

export interface ImpactAffectedFile {
  path: string;
  depth: number;
  isDirect: boolean;
  language: string;
  lineCount: number;
}

export interface ImpactAnalysisStatistics {
  directCount: number;
  indirectCount: number;
  totalAffected: number;
  maxDepth: number;
}

export interface ImpactAnalysisResult {
  success: boolean;
  target?: ImpactTargetInfo;
  directDependents: ImpactDependentFile[];
  indirectDependents: ImpactDependentFile[];
  affectedFiles: ImpactAffectedFile[];
  riskLevel: ImpactRiskLevel;
  statistics: ImpactAnalysisStatistics;
  error?: string;
}

export interface ImpactAnalysisRequest {
  repositoryUrl?: string;
  graph?: DependencyGraph;
  files?: FileMetric[];
  targetPath: string;
}


