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
  workspaceId?: string;
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

// Code Retrieval & Context Engine Types
export type SymbolKind = 'function' | 'class' | 'interface' | 'variable' | 'type' | 'enum' | 'method';

export interface ExtractedSymbol {
  name: string;
  kind: SymbolKind;
  lineStart: number;
  lineEnd: number;
  isExported: boolean;
}

export interface SearchResultSnippet {
  startLine: number;
  endLine: number;
  content: string;
}

export interface CodeSearchResult {
  filePath: string;
  language: string;
  score: number;
  matchedTerms: string[];
  lineRanges: { start: number; end: number }[];
  snippets: SearchResultSnippet[];
  symbols: ExtractedSymbol[];
  rankingExplanation?: string;
}

export interface CodeSearchOptions {
  maxResults?: number;
}

export interface ContextBuilderOptions {
  maxFiles?: number;
  maxLines?: number;
  maxCharacters?: number;
}

export interface RetrievedContext {
  files: CodeSearchResult[];
  totalFiles: number;
  totalLines: number;
  totalCharacters: number;
  formattedContext: string;
}

export interface AnalysisWorkspace {
  id: string;
  repositoryUrl: string;
  files: FileMetric[];
  fileContents: Map<string, string>;
  symbolsByFile: Map<string, ExtractedSymbol[]>;
  dependencyGraph: DependencyGraph;
  packageDependencies: PackageDependencies;
  createdAt: string;
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




