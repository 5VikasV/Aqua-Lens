import { describe, expect, it } from 'vitest';
import { buildFullGraph, connectedIds, fileNodeId, filterGraph, folderForPath, packageNodeId, unresolvedNodeId } from './graphModel';
import type { FileItem, Workspace } from '../types';

const file = (path: string, language = 'TypeScript'): FileItem => ({ path, language, lines: 20, bytes: 200, imports: [], symbols: [] });
const workspace: Workspace = {
  workspaceId: 'fixture', repository: { owner: 'test', name: 'sample', url: 'https://github.com/test/sample' },
  files: [file('src/ui/App.tsx'), file('src/ui/Button.tsx'), file('src/core/state.ts'), file('README.md', 'Markdown')],
  edges: [
    { source: 'src/ui/App.tsx', target: 'src/core/state.ts', kind: 'relative' },
    { source: 'src/ui/Button.tsx', target: 'src/core/state.ts', kind: 'relative' },
    { source: 'src/ui/App.tsx', target: 'react', kind: 'package' },
    { source: 'src/ui/Button.tsx', target: 'react', kind: 'package' },
    { source: 'src/ui/App.tsx', target: './missing', kind: 'package' },
    { source: 'src/ui/Button.tsx', target: './missing', kind: 'package' },
  ], languages: {}, metrics: { files: 4, lines: 80, dependencies: 6 },
};

describe('complete architecture graph', () => {
  it('keeps every analyzed file and import while deduplicating package nodes', () => {
    const graph = buildFullGraph(workspace);
    expect(folderForPath('README.md')).toBe('Repository root');
    expect(graph.nodes.filter(node => node.kind === 'file')).toHaveLength(4);
    expect(graph.nodes.filter(node => node.kind === 'package')).toHaveLength(1);
    expect(graph.nodes.find(node => node.id === unresolvedNodeId('src/ui/App.tsx', './missing'))?.kind).toBe('unresolved');
    expect(graph.nodes.filter(node => node.kind === 'unresolved')).toHaveLength(2);
    expect(graph.links).toHaveLength(6);
    expect(graph.links.filter(link => link.target === packageNodeId('react'))).toHaveLength(2);
    expect(connectedIds(graph.links, fileNodeId('src/core/state.ts'))).toEqual(new Set([
      fileNodeId('src/core/state.ts'), fileNodeId('src/ui/App.tsx'), fileNodeId('src/ui/Button.tsx'),
    ]));
  });

  it('starts with the complete graph and applies explicit filters only', () => {
    const graph = buildFullGraph(workspace);
    expect(filterGraph(graph, { folder: '', language: '', showPackages: true })).toEqual({ nodes: graph.nodes, links: graph.links });
    const filtered = filterGraph(graph, { folder: 'src/ui', language: '', showPackages: false });
    expect(filtered.nodes.map(node => node.id)).toEqual([fileNodeId('src/ui/App.tsx'), fileNodeId('src/ui/Button.tsx')]);
    expect(filtered.links).toHaveLength(0);
  });
});
