import { AnalysisWorkspace } from '../types/index.js';

class WorkspaceStore {
  private workspaces: Map<string, AnalysisWorkspace> = new Map();
  private repoUrlToWorkspaceId: Map<string, string> = new Map();

  public saveWorkspace(workspace: AnalysisWorkspace): void {
    this.workspaces.set(workspace.id, workspace);
    if (workspace.repositoryUrl) {
      const normalizedUrl = workspace.repositoryUrl.toLowerCase().trim();
      this.repoUrlToWorkspaceId.set(normalizedUrl, workspace.id);
    }
  }

  public getWorkspace(idOrUrl: string): AnalysisWorkspace | undefined {
    if (!idOrUrl) return undefined;
    if (this.workspaces.has(idOrUrl)) {
      return this.workspaces.get(idOrUrl);
    }
    const normalizedUrl = idOrUrl.toLowerCase().trim();
    const id = this.repoUrlToWorkspaceId.get(normalizedUrl);
    if (id && this.workspaces.has(id)) {
      return this.workspaces.get(id);
    }
    return undefined;
  }

  public hasWorkspace(idOrUrl: string): boolean {
    return this.getWorkspace(idOrUrl) !== undefined;
  }

  public deleteWorkspace(idOrUrl: string): boolean {
    const ws = this.getWorkspace(idOrUrl);
    if (!ws) return false;
    this.workspaces.delete(ws.id);
    if (ws.repositoryUrl) {
      const normalizedUrl = ws.repositoryUrl.toLowerCase().trim();
      this.repoUrlToWorkspaceId.delete(normalizedUrl);
    }
    return true;
  }

  public clear(): void {
    this.workspaces.clear();
    this.repoUrlToWorkspaceId.clear();
  }
}

export const workspaceStore = new WorkspaceStore();
