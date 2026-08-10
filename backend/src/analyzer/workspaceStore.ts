import { AnalysisWorkspace } from '../types/index.js';

interface StoreEntry {
  workspace: AnalysisWorkspace;
  lastAccessedAt: number;
}

export class WorkspaceStore {
  private workspaces: Map<string, StoreEntry> = new Map();
  private repoUrlToWorkspaceId: Map<string, string> = new Map();
  private maxWorkspaces: number;
  private ttlMs: number;

  constructor(maxWorkspaces: number = 10, ttlMs: number = 2 * 60 * 60 * 1000) {
    this.maxWorkspaces = maxWorkspaces;
    this.ttlMs = ttlMs;
  }

  public configure(maxWorkspaces?: number, ttlMs?: number): void {
    if (typeof maxWorkspaces === 'number' && maxWorkspaces > 0) {
      this.maxWorkspaces = maxWorkspaces;
    }
    if (typeof ttlMs === 'number' && ttlMs > 0) {
      this.ttlMs = ttlMs;
    }
  }

  public saveWorkspace(workspace: AnalysisWorkspace): void {
    if (!workspace || !workspace.id) return;

    this.cleanupExpiredLazy();

    // If workspace already exists, delete old entry to update insertion order
    if (this.workspaces.has(workspace.id)) {
      this.workspaces.delete(workspace.id);
    } else if (this.workspaces.size >= this.maxWorkspaces) {
      // LRU Eviction: remove oldest (first inserted key in Map)
      const lruKey = this.workspaces.keys().next().value;
      if (lruKey) {
        this.removeById(lruKey);
      }
    }

    const entry: StoreEntry = {
      workspace,
      lastAccessedAt: Date.now()
    };

    this.workspaces.set(workspace.id, entry);

    if (workspace.repositoryUrl) {
      const canonicalUrl = this.canonicalizeUrl(workspace.repositoryUrl);
      this.repoUrlToWorkspaceId.set(canonicalUrl, workspace.id);
    }
  }

  public getWorkspace(idOrUrl: string): AnalysisWorkspace | undefined {
    if (!idOrUrl) return undefined;

    let targetId: string | undefined = undefined;

    if (this.workspaces.has(idOrUrl)) {
      targetId = idOrUrl;
    } else {
      const canonicalUrl = this.canonicalizeUrl(idOrUrl);
      targetId = this.repoUrlToWorkspaceId.get(canonicalUrl);
    }

    if (!targetId || !this.workspaces.has(targetId)) {
      return undefined;
    }

    const entry = this.workspaces.get(targetId)!;
    const now = Date.now();

    // Lazy TTL Check
    if (now - entry.lastAccessedAt > this.ttlMs) {
      this.removeById(targetId);
      return undefined;
    }

    // Refresh LRU order and timestamp
    entry.lastAccessedAt = now;
    this.workspaces.delete(targetId);
    this.workspaces.set(targetId, entry);

    return entry.workspace;
  }

  public hasWorkspace(idOrUrl: string): boolean {
    return this.getWorkspace(idOrUrl) !== undefined;
  }

  public deleteWorkspace(idOrUrl: string): boolean {
    if (!idOrUrl) return false;

    let targetId: string | undefined = undefined;
    if (this.workspaces.has(idOrUrl)) {
      targetId = idOrUrl;
    } else {
      const canonicalUrl = this.canonicalizeUrl(idOrUrl);
      targetId = this.repoUrlToWorkspaceId.get(canonicalUrl);
    }

    if (!targetId || !this.workspaces.has(targetId)) {
      return false;
    }

    this.removeById(targetId);
    return true;
  }

  public clear(): void {
    this.workspaces.clear();
    this.repoUrlToWorkspaceId.clear();
  }

  public getSize(): number {
    this.cleanupExpiredLazy();
    return this.workspaces.size;
  }

  private removeById(id: string): void {
    const entry = this.workspaces.get(id);
    if (entry && entry.workspace.repositoryUrl) {
      const canonicalUrl = this.canonicalizeUrl(entry.workspace.repositoryUrl);
      this.repoUrlToWorkspaceId.delete(canonicalUrl);
    }
    this.workspaces.delete(id);
  }

  private cleanupExpiredLazy(): void {
    const now = Date.now();
    for (const [id, entry] of Array.from(this.workspaces.entries())) {
      if (now - entry.lastAccessedAt > this.ttlMs) {
        this.removeById(id);
      }
    }
  }

  private canonicalizeUrl(url: string): string {
    return url.toLowerCase().trim().replace(/\.git$/, '').replace(/\/$/, '');
  }
}

export const workspaceStore = new WorkspaceStore();
