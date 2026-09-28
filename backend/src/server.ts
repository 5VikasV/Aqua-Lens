import 'dotenv/config';
import crypto from 'node:crypto';
import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { GoogleGenAI } from '@google/genai';

const execFile = promisify(execFileCallback);
const app = express();
const port = Number(process.env.PORT || 5000);
const ttlMs = Number(process.env.WORKSPACE_TTL_SECONDS || 7200) * 1000;
const maxFiles = Number(process.env.MAX_REPOSITORY_FILES || 2500);
const maxFileSize = Number(process.env.MAX_FILE_SIZE_BYTES || 750_000);

type Edge = { source: string; target: string; specifier: string; kind: 'relative' | 'package' };
type SourceFile = { path: string; language: string; lines: number; bytes: number; imports: string[]; symbols: string[]; content: string };
type Workspace = { id: string; repositoryUrl: string; owner: string; name: string; createdAt: string; files: SourceFile[]; edges: Edge[] };
type AnalysisStage = 'queued' | 'cloning' | 'scanning' | 'mapping' | 'ready' | 'failed';
type Job = { id: string; state: 'queued' | 'running' | 'succeeded' | 'failed'; progress: number; stage: AnalysisStage; workspace?: Workspace; error?: string };
const jobs = new Map<string, Job>();
const workspaces = new Map<string, Workspace>();

app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json({ limit: '32kb' }));

function repositoryParts(input: unknown): { normalized: string; owner: string; name: string } | undefined {
  if (typeof input !== 'string') return undefined;
  const match = input.trim().match(/^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i);
  if (!match) return undefined;
  return { normalized: `https://github.com/${match[1]}/${match[2]}`, owner: match[1], name: match[2] };
}

function languageFor(file: string): string | undefined {
  const extension = path.extname(file).toLowerCase();
  return ({ '.ts': 'TypeScript', '.tsx': 'TypeScript', '.js': 'JavaScript', '.jsx': 'JavaScript', '.py': 'Python', '.go': 'Go', '.json': 'JSON', '.css': 'CSS', '.html': 'HTML', '.md': 'Markdown' } as Record<string, string>)[extension];
}

async function collectFiles(root: string, current = '', results: SourceFile[] = []): Promise<SourceFile[]> {
  if (results.length >= maxFiles) return results;
  const ignored = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', 'vendor', '.next']);
  for (const entry of await readdir(path.join(root, current), { withFileTypes: true })) {
    if (ignored.has(entry.name) || results.length >= maxFiles) continue;
    const relative = path.posix.join(current, entry.name);
    if (entry.isDirectory()) { await collectFiles(root, relative, results); continue; }
    const language = languageFor(entry.name);
    if (!language || !entry.isFile()) continue;
    const absolute = path.join(root, relative);
    const info = await stat(absolute);
    if (info.size > maxFileSize) continue;
    const content = await readFile(absolute, 'utf8').catch(() => '');
    if (!content || content.includes('\0')) continue;
    const imports = extractImports(content, language);
    results.push({ path: relative, language, lines: content.split('\n').length, bytes: info.size, imports, symbols: extractSymbols(content, language), content });
  }
  return results;
}

function extractImports(content: string, language: string): string[] {
  const values = new Set<string>();
  const patterns = language === 'Python'
    ? [/^\s*(?:from\s+([\w.]+)|import\s+([\w.]+))/gm]
    : language === 'Go'
      ? [/^\s*import\s+(?:\w+\s+)?["`]([^"`]+)["`]/gm]
      : [/(?:import\s+(?:[^'";]+?\s+from\s+)?|require\()\s*[('"`]([^'"`)+]+)['"`)]/gm];
  for (const pattern of patterns) for (const match of content.matchAll(pattern)) values.add((match[1] || match[2]).trim());
  return [...values];
}

function extractSymbols(content: string, language: string): string[] {
  const patterns = language === 'Python'
    ? [/^\s*(?:async\s+)?def\s+(\w+)/gm, /^\s*class\s+(\w+)/gm]
    : [/\b(?:export\s+)?(?:async\s+)?function\s+(\w+)/gm, /\b(?:export\s+)?class\s+(\w+)/gm, /\b(?:export\s+)?(?:const|let)\s+(\w+)\s*=/gm];
  const values = new Set<string>();
  for (const pattern of patterns) for (const match of content.matchAll(pattern)) values.add(match[1]);
  return [...values].slice(0, 100);
}

function resolveImport(source: SourceFile, specifier: string, files: SourceFile[]): string | undefined {
  if (!specifier.startsWith('.')) return undefined;
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(source.path), specifier));
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`, `${base}.py`, `${base}.go`, `${base}/index.ts`, `${base}/index.js`];
  return files.find(file => candidates.includes(file.path))?.path;
}

function summarize(workspace: Workspace) {
  const languages: Record<string, { files: number; lines: number }> = {};
  for (const file of workspace.files) languages[file.language] = { files: (languages[file.language]?.files || 0) + 1, lines: (languages[file.language]?.lines || 0) + file.lines };
  return { workspaceId: workspace.id, repository: { url: workspace.repositoryUrl, owner: workspace.owner, name: workspace.name }, files: workspace.files.map(({ content, ...file }) => file), edges: workspace.edges, languages, metrics: { files: workspace.files.length, lines: workspace.files.reduce((sum, file) => sum + file.lines, 0), dependencies: workspace.edges.length, analyzedAt: workspace.createdAt } };
}

async function analyze(url: string, parts: NonNullable<ReturnType<typeof repositoryParts>>, report: (stage: AnalysisStage, progress: number) => void): Promise<Workspace> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'aqua-lens-'));
  const checkout = path.join(directory, 'repository');
  try {
    report('cloning', 18);
    await execFile('git', ['clone', '--depth', '1', '--no-tags', url, checkout], { timeout: 90_000, maxBuffer: 1024 * 1024 });
    report('scanning', 52);
    const files = await collectFiles(checkout);
    report('mapping', 78);
    const edges: Edge[] = [];
    for (const source of files) for (const specifier of source.imports) {
      const target = resolveImport(source, specifier, files);
      edges.push({ source: source.path, target: target || specifier, specifier, kind: target ? 'relative' : 'package' });
    }
    return { id: crypto.randomUUID(), repositoryUrl: parts.normalized, owner: parts.owner, name: parts.name, createdAt: new Date().toISOString(), files, edges };
  } finally { await rm(directory, { recursive: true, force: true }); }
}

function purgeExpired() {
  const cutoff = Date.now() - ttlMs;
  for (const [id, workspace] of workspaces) if (Date.parse(workspace.createdAt) < cutoff) workspaces.delete(id);
  for (const [id, job] of jobs) if (job.workspace && Date.parse(job.workspace.createdAt) < cutoff) jobs.delete(id);
}

function evidence(workspace: Workspace, question: string) {
  const terms: string[] = question.toLowerCase().match(/[a-z][a-z0-9_-]{2,}/g) || [];
  return workspace.files.map(file => {
    const lower = `${file.path}\n${file.content}`.toLowerCase();
    const matches = terms.filter(term => lower.includes(term));
    const line = file.content.split('\n').findIndex(value => terms.some(term => value.toLowerCase().includes(term))) + 1;
    return { filePath: file.path, score: matches.length * 20 + (file.symbols.some(symbol => terms.includes(symbol.toLowerCase())) ? 25 : 0), lineStart: Math.max(1, line), lineEnd: Math.max(1, line) + 8, symbols: file.symbols.filter(symbol => terms.some(term => symbol.toLowerCase().includes(term))).slice(0, 6), snippet: file.content.split('\n').slice(Math.max(0, line - 1), Math.max(0, line - 1) + 9).join('\n') };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 6);
}

async function aiAnswer(question: string, items: ReturnType<typeof evidence>) {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key || items.length === 0) return undefined;
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const context = items.map(item => `FILE ${item.filePath} (lines ${item.lineStart}-${item.lineEnd})\n${item.snippet}`).join('\n\n');
    const response = await ai.models.generateContent({ model: process.env.GEMINI_MODEL || 'gemini-2.0-flash', contents: `Answer this codebase question using only the evidence below. If evidence is insufficient, say so.\nQuestion: ${question}\n\n${context}` });
    return response.text?.trim();
  } catch { return undefined; }
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'aqua-lens-v2', mode: 'local-memory', uptimeSeconds: Math.floor(process.uptime()) }));

app.post('/api/analyses', async (req, res) => {
  purgeExpired();
  const parts = repositoryParts(req.body?.repositoryUrl);
  if (!parts) return res.status(400).json({ error: 'Enter a public GitHub repository URL, for example https://github.com/owner/repository.' });
  const job: Job = { id: crypto.randomUUID(), state: 'queued', progress: 0, stage: 'queued' };
  jobs.set(job.id, job);
  void (async () => {
    job.state = 'running'; job.progress = 8;
    try { const workspace = await analyze(parts.normalized, parts, (stage, progress) => { job.stage = stage; job.progress = progress; }); job.workspace = workspace; workspaces.set(workspace.id, workspace); job.progress = 100; job.stage = 'ready'; job.state = 'succeeded'; }
    catch (error: any) { job.state = 'failed'; job.stage = 'failed'; job.error = error?.message?.includes('clone') ? 'Unable to clone this public GitHub repository.' : 'Repository analysis failed. Please try again.'; }
  })();
  res.status(202).json({ job: { id: job.id, state: job.state, progress: job.progress, stage: job.stage } });
});

app.get('/api/analyses/:id', (req, res) => { purgeExpired(); const job = jobs.get(req.params.id); if (!job) return res.status(404).json({ error: 'Analysis job expired or was not found.' }); res.json({ job: { id: job.id, state: job.state, progress: job.progress, stage: job.stage, result: job.workspace ? summarize(job.workspace) : undefined, error: job.error } }); });
app.get('/api/workspaces/:id', (req, res) => { purgeExpired(); const workspace = workspaces.get(req.params.id); if (!workspace) return res.status(404).json({ error: 'Workspace expired. Analyze the repository again.' }); res.json(summarize(workspace)); });
app.get('/api/workspaces/:id/files/:filePath(*)', (req, res) => { const workspace = workspaces.get(req.params.id); const file = workspace?.files.find(item => item.path === req.params.filePath); if (!file) return res.status(404).json({ error: 'Source file not found.' }); res.json({ path: file.path, language: file.language, content: file.content, symbols: file.symbols }); });

app.post('/api/investigate', async (req, res) => {
  purgeExpired(); const workspace = workspaces.get(req.body?.workspaceId); const question = String(req.body?.question || '').trim();
  if (!workspace) return res.status(404).json({ error: 'Workspace expired. Analyze the repository again.' });
  if (!question) return res.status(400).json({ error: 'Ask a question about the codebase.' });
  const items = evidence(workspace, question); const generated = await aiAnswer(question, items);
  const answer = generated || (items.length ? `I found ${items.length} relevant source files. The strongest match is ${items[0].filePath}; inspect the linked evidence for the implementation details.` : 'No matching code evidence was found for that question.');
  res.json({ answer, mode: generated ? 'gemini-grounded' : 'deterministic', evidence: items });
});

app.post('/api/impact', (req, res) => {
  purgeExpired(); const workspace = workspaces.get(req.body?.workspaceId); const target = String(req.body?.targetPath || '');
  if (!workspace) return res.status(404).json({ error: 'Workspace expired. Analyze the repository again.' });
  if (!workspace.files.some(file => file.path === target)) return res.status(404).json({ error: 'Select a file from this workspace.' });
  const reverse = new Map<string, string[]>(); for (const edge of workspace.edges) if (edge.kind === 'relative') reverse.set(edge.target, [...(reverse.get(edge.target) || []), edge.source]);
  const seen = new Map<string, number>([[target, 0]]); const queue = [target];
  while (queue.length) { const current = queue.shift()!; for (const dependent of reverse.get(current) || []) if (!seen.has(dependent)) { seen.set(dependent, seen.get(current)! + 1); queue.push(dependent); } }
  const affected = [...seen.entries()].filter(([file]) => file !== target).map(([file, depth]) => ({ path: file, depth }));
  const risk = affected.length > 20 ? 'critical' : affected.length > 8 ? 'high' : affected.length > 2 ? 'medium' : 'low';
  res.json({ targetPath: target, affected, risk });
});

app.post('/api/plans', async (req, res) => {
  purgeExpired(); const workspace = workspaces.get(req.body?.workspaceId); const request = String(req.body?.request || '').trim();
  if (!workspace) return res.status(404).json({ error: 'Workspace expired. Analyze the repository again.' });
  if (!request) return res.status(400).json({ error: 'Describe the change you want to plan.' });
  const items = evidence(workspace, request); const primary = items[0];
  res.json({ title: `Change plan: ${request.slice(0, 72)}`, summary: primary ? `Evidence points first to ${primary.filePath}. Validate this change against its dependents before implementation.` : 'No strong target file was found; refine the request with feature or symbol names.', targetFiles: items.map(item => item.filePath), steps: primary ? [{ order: 1, title: `Inspect ${primary.filePath}`, description: 'Confirm the current behavior and exported symbols using the cited source.' }, { order: 2, title: 'Implement the scoped change', description: `Modify the smallest responsible unit for: ${request}` }, { order: 3, title: 'Verify impact', description: 'Run focused tests and review downstream importers before merging.' }] : [], evidence: items });
});

app.listen(port, () => console.log(`Aqua Lens v2 API listening on http://localhost:${port}`));
