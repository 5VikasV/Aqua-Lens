export type FileItem = { path: string; language: string; lines: number; bytes: number; imports: string[]; symbols: string[] };
export type Edge = { source: string; target: string; kind: 'relative' | 'package'; specifier?: string };
export type Workspace = { workspaceId: string; repository: { owner: string; name: string; url: string }; files: FileItem[]; edges: Edge[]; languages: Record<string, { files: number; lines: number }>; metrics: { files: number; lines: number; dependencies: number } };
export type Job = { id: string; state: 'queued' | 'running' | 'succeeded' | 'failed'; stage: string; progress: number; result?: Workspace; error?: string };
export type Evidence = { filePath: string; score: number; lineStart: number; lineEnd: number; symbols: string[]; snippet: string };
export type Investigation = { answer: string; mode: string; evidence: Evidence[] };
export type ImpactResult = { targetPath: string; risk: string; affected: { path: string; depth: number }[] };
export type PlanResult = { title: string; summary: string; targetFiles: string[]; steps: { order: number; title: string; description: string }[]; evidence: Evidence[] };
