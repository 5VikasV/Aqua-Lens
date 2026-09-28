import type { Workspace } from '../types';

export type GraphNode = {
  id: string;
  kind: 'file' | 'package' | 'unresolved';
  name: string;
  path: string;
  folder: string;
  language?: string;
  lines?: number;
  x: number;
  y: number;
  z: number;
};

export type GraphLink = {
  id: string;
  source: string;
  target: string;
  kind: 'relative' | 'package' | 'unresolved';
  specifier?: string;
};

export type FullGraph = { nodes: GraphNode[]; links: GraphLink[]; folders: string[]; languages: string[] };
export type GraphFilters = { folder: string; language: string; showPackages: boolean };

export const fileNodeId = (path: string) => `file:${path}`;
export const packageNodeId = (path: string) => `package:${path}`;
export const unresolvedNodeId = (source: string, specifier: string) => `unresolved:${JSON.stringify([source, specifier])}`;

export function folderForPath(path: string): string {
  const parts = path.split('/');
  if (parts.length === 1) return 'Repository root';
  return parts.slice(0, Math.min(2, parts.length - 1)).join('/');
}

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index++) result = Math.imul(result ^ value.charCodeAt(index), 16777619);
  return result >>> 0;
}

function direction(index: number, total: number): [number, number, number] {
  const z = 1 - 2 * (index + .5) / Math.max(1, total);
  const angle = index * Math.PI * (3 - Math.sqrt(5));
  const radius = Math.sqrt(1 - z * z);
  return [Math.cos(angle) * radius, Math.sin(angle) * radius, z];
}

export function buildFullGraph(workspace: Workspace): FullGraph {
  const folders = [...new Set(workspace.files.map(file => folderForPath(file.path)))].sort();
  const languages = [...new Set(workspace.files.map(file => file.language))].sort();
  const folderIndex = new Map(folders.map((folder, index) => [folder, index]));
  const folderSizes = new Map<string, number>();
  const filePaths = new Set(workspace.files.map(file => file.path));
  const nodes: GraphNode[] = workspace.files.map(file => {
    const folder = folderForPath(file.path);
    const index = folderSizes.get(folder) || 0;
    folderSizes.set(folder, index + 1);
    const [cx, cy, cz] = direction(folderIndex.get(folder) || 0, folders.length);
    const noise = hash(file.path);
    const a = index * 2.39996 + (noise % 100) / 100;
    const spread = 9 + 3.3 * Math.sqrt(index);
    return {
      id: fileNodeId(file.path), kind: 'file', name: file.path.split('/').pop() || file.path,
      path: file.path, folder, language: file.language, lines: file.lines,
      x: cx * 90 + Math.cos(a) * spread,
      y: cy * 90 + Math.sin(a) * spread,
      z: cz * 90 + ((noise % 23) - 11) * .9,
    };
  });
  const external = new Map<string, GraphNode>();
  const links: GraphLink[] = [];
  const externalCount = new Set(workspace.edges.filter(edge => edge.kind === 'package' || !filePaths.has(edge.target)).map(edge => edge.target.startsWith('.') || edge.kind === 'relative' ? unresolvedNodeId(edge.source, edge.target) : packageNodeId(edge.target))).size;
  for (const [index, edge] of workspace.edges.entries()) {
    if (!filePaths.has(edge.source)) continue;
    if (edge.kind === 'relative' && filePaths.has(edge.target)) {
      links.push({ id: `import:${index}`, source: fileNodeId(edge.source), target: fileNodeId(edge.target), kind: 'relative', specifier: edge.specifier });
      continue;
    }
    const unresolved = edge.target.startsWith('.') || edge.kind === 'relative';
    const target = unresolved ? unresolvedNodeId(edge.source, edge.target) : packageNodeId(edge.target);
    if (!external.has(target)) {
      const [x, y, z] = direction(external.size, Math.max(1, externalCount));
      external.set(target, {
        id: target, kind: unresolved ? 'unresolved' : 'package', name: edge.target,
        path: unresolved ? `${edge.source} → ${edge.target}` : edge.target, folder: unresolved ? 'Unresolved imports' : 'External packages',
        x: x * 185, y: y * 185, z: z * 185,
      });
    }
    links.push({ id: `import:${index}`, source: fileNodeId(edge.source), target, kind: unresolved ? 'unresolved' : 'package', specifier: edge.specifier });
  }
  return { nodes: [...nodes, ...external.values()], links, folders, languages };
}

export function filterGraph(graph: FullGraph, filters: GraphFilters): { nodes: GraphNode[]; links: GraphLink[] } {
  const files = graph.nodes.filter(node => node.kind === 'file' && (!filters.folder || node.folder === filters.folder) && (!filters.language || node.language === filters.language));
  const fileIds = new Set(files.map(node => node.id));
  const links = graph.links.filter(link => fileIds.has(link.source) && (link.kind === 'relative' ? fileIds.has(link.target) : filters.showPackages));
  const externalIds = new Set(links.filter(link => link.kind !== 'relative').map(link => link.target));
  const nodes = [...files, ...graph.nodes.filter(node => node.kind !== 'file' && externalIds.has(node.id))];
  return { nodes, links };
}

export function connectedIds(links: GraphLink[], nodeId: string): Set<string> {
  const ids = new Set([nodeId]);
  for (const link of links) {
    if (link.source === nodeId) ids.add(link.target);
    if (link.target === nodeId) ids.add(link.source);
  }
  return ids;
}
