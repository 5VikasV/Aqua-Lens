export type ViewMode = 
  | 'landing'
  | 'init-workspace'
  | 'analysis-progress'
  | 'overview'
  | 'architecture'
  | 'investigate'
  | 'impact'
  | 'plan';

export interface RepositoryInfo {
  url: string;
  owner: string;
  name: string;
  description: string;
  isPublic: boolean;
  stars: string;
  forks: string;
  lastCommit: string;
  language: string;
  updatedAgo: string;
}

export interface ArchitectureNode {
  id: string;
  label: string;
  type: 'client' | 'gateway' | 'service' | 'database' | 'util';
  x: number;
  y: number;
  status: 'healthy' | 'warning' | 'error';
  version?: string;
  latency?: string;
  outgoingCount?: number;
  requestVolume?: number[];
  filePath?: string;
}

export interface Finding {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'Architecture' | 'API' | 'Performance' | 'Security';
  title: string;
  description: string;
  affectedPath?: string;
  isNew?: boolean;
}

export interface PipelineStep {
  id: number;
  title: string;
  detail: string;
  status: 'completed' | 'active' | 'pending';
  timeOrCount?: string;
  progressPercent?: number;
}

export interface TerminalLog {
  id: string;
  time: string;
  prefix: 'SYS>' | 'AST>' | 'IDX>' | 'ERR>';
  message: string;
  type?: 'normal' | 'highlight' | 'warning' | 'error';
}

export interface AffectedFile {
  id: string;
  path: string;
  level: number;
  isCritical: boolean;
  icon: string;
}

export interface ChangeStep {
  id: string;
  stepNumber: string;
  type: 'Modify' | 'Create' | 'Update' | 'Migration';
  filePath: string;
  badgeText?: string;
  isWarning?: boolean;
  linesCount?: number;
  description?: string;
  diffHeader?: string;
  diffLines?: {
    numBefore?: number;
    numAfter?: number;
    type: 'same' | 'add' | 'remove';
    content: string;
  }[];
}

// Real Backend Analysis API Types
export interface BackendRepositoryInfo {
  url: string;
  owner: string;
  name: string;
  clonedAt: string;
}

export interface BackendFileMetric {
  path: string;
  extension: string;
  language: string;
  sizeBytes: number;
  lineCount: number;
  importsCount: number;
  exportsCount: number;
}

export interface BackendDependencyNode {
  id: string;
  label: string;
  language: string;
  lineCount: number;
  sizeBytes: number;
}

export interface BackendDependencyEdge {
  source: string;
  target: string;
  importSpecifier: string;
  type: 'relative' | 'package';
}

export interface BackendDependencyGraph {
  nodes: BackendDependencyNode[];
  edges: BackendDependencyEdge[];
}

export interface BackendPackageDependencies {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export interface BackendLanguageMetric {
  language: string;
  fileCount: number;
  lineCount: number;
  percentage: number;
}

export interface BackendAnalysisSummary {
  totalFilesScanned: number;
  totalFilesIgnored: number;
  totalLinesOfCode: number;
  totalSizeBytes: number;
  totalDependencies: number;
  analysisTimeMs: number;
}

export interface AnalyzeResponse {
  success: boolean;
  workspaceId?: string;
  repository: BackendRepositoryInfo;
  languages: BackendLanguageMetric[];
  fileCount: number;
  dependencyCount: number;
  files: BackendFileMetric[];
  dependencyGraph: BackendDependencyGraph;
  packageDependencies: BackendPackageDependencies;
  metrics: BackendAnalysisSummary;
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
  graph?: BackendDependencyGraph;
  files?: BackendFileMetric[];
  targetPath: string;
}

// AI Investigation Types
export interface InvestigateRequest {
  workspaceId: string;
  question: string;
}

export interface InvestigateEvidence {
  id: string;
  filePath: string;
  matchedSymbols: string[];
  lineRanges: { start: number; end: number }[];
  snippet: string;
  relevanceScore: number;
}

export interface InvestigateClaim {
  text: string;
  evidenceIds: string[];
}

export interface InvestigateResponse {
  success: boolean;
  answer: string;
  claims: InvestigateClaim[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  evidence: InvestigateEvidence[];
  referencedFiles: string[];
  retrievedContextMetadata: {
    totalFilesRetrieved: number;
    totalLinesRetrieved: number;
    totalCharactersRetrieved: number;
    queryTermsUsed: string[];
  };
  error?: string;
}



