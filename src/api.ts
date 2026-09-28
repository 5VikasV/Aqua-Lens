import type { ImpactResult, Investigation, Job, PlanResult, Workspace } from './types';

const base = import.meta.env.VITE_API_URL || 'http://localhost:5000';
async function request<T>(url: string, body?: object): Promise<T> {
  const response = await fetch(`${base}${url}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data as T;
}
export const api = {
  start: (repositoryUrl: string) => request<{ job: Job }>('/api/analyses', { repositoryUrl }),
  job: (id: string) => request<{ job: Job }>(`/api/analyses/${encodeURIComponent(id)}`),
  workspace: (id: string) => request<Workspace>(`/api/workspaces/${encodeURIComponent(id)}`),
  investigate: (workspaceId: string, question: string) => request<Investigation>('/api/investigate', { workspaceId, question }),
  impact: (workspaceId: string, targetPath: string) => request<ImpactResult>('/api/impact', { workspaceId, targetPath }),
  plan: (workspaceId: string, changeRequest: string) => request<PlanResult>('/api/plans', { workspaceId, request: changeRequest }),
  source: (workspaceId: string, filePath: string) => request<{ path: string; language: string; content: string; symbols: string[] }>(`/api/workspaces/${encodeURIComponent(workspaceId)}/files/${filePath.split('/').map(encodeURIComponent).join('/')}`),
};
