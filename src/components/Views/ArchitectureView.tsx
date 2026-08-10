import React, { useState, useMemo } from 'react';
import { ViewMode, AnalyzeResponse } from '../../types';

interface ArchitectureViewProps {
  analysisData?: AnalyzeResponse | null;
  onSelectView: (view: ViewMode) => void;
}

interface DynamicGraphNode {
  id: string;
  label: string;
  language: string;
  lineCount: number;
  sizeBytes: number;
  importsCount: number;
  exportsCount: number;
  degree: number;
  x: number;
  y: number;
  type: 'service' | 'gateway' | 'database' | 'client' | 'util';
}

export const ArchitectureView: React.FC<ArchitectureViewProps> = ({ analysisData, onSelectView }) => {
  const [nodeLimit, setNodeLimit] = useState<number>(15);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'layered'>('grid');

  const [filters, setFilters] = useState({
    code: true,
    data: true,
    docs: true
  });

  const toggleFilter = (key: keyof typeof filters) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Process Real Backend Dependency Graph from AnalyzeResponse
  const { visibleNodes, visibleEdges, rawTotalNodes, rawTotalEdges, canvasWidth, canvasHeight } = useMemo(() => {
    if (!analysisData || !analysisData.dependencyGraph || !analysisData.dependencyGraph.nodes) {
      return {
        visibleNodes: [],
        visibleEdges: [],
        rawTotalNodes: 0,
        rawTotalEdges: 0,
        canvasWidth: 1050,
        canvasHeight: 650
      };
    }

    const backendGraph = analysisData.dependencyGraph;
    const fileMap = new Map<string, { lineCount: number; sizeBytes: number; language: string; importsCount?: number; exportsCount?: number }>();

    if (analysisData.files) {
      for (const f of analysisData.files) {
        fileMap.set(f.path, f);
      }
    }

    // Calculate degree (incoming + outgoing connection count) for each node
    const nodeDegree = new Map<string, number>();
    for (const edge of backendGraph.edges) {
      nodeDegree.set(edge.source, (nodeDegree.get(edge.source) || 0) + 1);
      nodeDegree.set(edge.target, (nodeDegree.get(edge.target) || 0) + 1);
    }

    // Sort nodes by relevance (degree descending, line count descending)
    const sortedNodes = [...backendGraph.nodes].sort((a, b) => {
      const degA = nodeDegree.get(a.id) || 0;
      const degB = nodeDegree.get(b.id) || 0;
      if (degB !== degA) return degB - degA;
      return (b.lineCount || 0) - (a.lineCount || 0);
    });

    // Apply search and category filter
    const filtered = sortedNodes.filter(n => {
      if (searchQuery.trim() && !n.id.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      const lang = (n.language || '').toLowerCase();
      if (!filters.code && (lang.includes('typescript') || lang.includes('javascript') || lang.includes('python') || lang.includes('go') || lang.includes('code'))) return false;
      if (!filters.data && (lang.includes('json') || lang.includes('yaml') || lang.includes('sql') || lang.includes('config'))) return false;
      if (!filters.docs && (lang.includes('markdown') || lang.includes('text') || lang.includes('doc'))) return false;
      return true;
    });

    // Limit visible nodes for visual clarity & SVG performance
    const sliced = filtered.slice(0, nodeLimit);

    // Compute deterministic 2D grid coordinates for sliced nodes
    const columns = layoutMode === 'grid' ? 4 : 3;
    const colSpacing = 240;
    const rowSpacing = 130;
    const startX = 80;
    const startY = 80;

    // Detect duplicate base filenames to show workspace path when colliding
    const labelCounts = new Map<string, number>();
    for (const n of sliced) {
      const base = n.label || n.id.split('/').pop() || n.id;
      labelCounts.set(base, (labelCounts.get(base) || 0) + 1);
    }

    const dynamicNodes: DynamicGraphNode[] = sliced.map((n, idx) => {
      const col = idx % columns;
      const row = Math.floor(idx / columns);
      const fileInfo = fileMap.get(n.id);
      const lang = n.language || fileInfo?.language || 'Code';

      const baseLabel = n.label || n.id.split('/').pop() || n.id;
      const isDuplicate = (labelCounts.get(baseLabel) || 0) > 1;

      return {
        id: n.id,
        label: isDuplicate ? n.id : baseLabel,
        language: lang,
        lineCount: n.lineCount || fileInfo?.lineCount || 0,
        sizeBytes: n.sizeBytes || fileInfo?.sizeBytes || 0,
        importsCount: fileInfo?.importsCount || 0,
        exportsCount: fileInfo?.exportsCount || 0,
        degree: nodeDegree.get(n.id) || 0,
        x: startX + col * colSpacing,
        y: startY + row * rowSpacing,
        type: lang.includes('JSON') || lang.includes('SQL') ? 'database' : lang.includes('Markdown') ? 'util' : 'service'
      };
    });

    // Filter edges that connect visible nodes
    const visibleNodeIds = new Set(dynamicNodes.map(n => n.id));
    const dynamicEdges = backendGraph.edges.filter(
      e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
    );

    // Compute exact SVG canvas dimensions from dynamic node grid bounds
    const totalRows = Math.ceil(dynamicNodes.length / columns);
    const canvasWidth = Math.max(1050, startX + columns * colSpacing + 120);
    const canvasHeight = Math.max(650, startY + totalRows * rowSpacing + 120);

    return {
      visibleNodes: dynamicNodes,
      visibleEdges: dynamicEdges,
      rawTotalNodes: backendGraph.nodes.length,
      rawTotalEdges: backendGraph.edges.length,
      canvasWidth,
      canvasHeight
    };
  }, [analysisData, nodeLimit, searchQuery, filters, layoutMode]);

  // Active selected node detail
  const selectedNode = visibleNodes.find(n => n.id === selectedNodeId) || visibleNodes[0];

  // 1. Empty / No Workspace State
  if (!analysisData || !analysisData.dependencyGraph || rawTotalNodes === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-xl mx-auto space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-lg">
          <span className="material-symbols-outlined text-[36px]">account_tree</span>
        </div>
        <div className="space-y-2">
          <h2 className="font-display-lg text-2xl text-on-surface">No Architecture Topology Available</h2>
          <p className="text-body-sm text-on-surface-variant leading-relaxed">
            Analyze a GitHub repository to visualize real file nodes, AST dependency import edges, and interactive code topology.
          </p>
        </div>
        <button
          onClick={() => onSelectView('init-workspace')}
          className="px-6 py-3 bg-primary-container hover:bg-primary-fixed text-on-primary-container font-semibold rounded-2xl text-body-sm transition-all shadow-md flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">cloud_download</span>
          Analyze a Repository
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-80px)] flex flex-col font-body-md overflow-hidden bg-surface-container-lowest border border-outline-variant/30 rounded-3xl shadow-2xl">
      
      {/* Top Controls & Search Bar */}
      <div className="h-16 bg-surface-container/90 backdrop-blur-md px-6 flex items-center justify-between border-b border-outline-variant/30 z-20 shrink-0 gap-4">
        {/* Category Filters */}
        <div className="flex items-center gap-4">
          <span className="text-xs font-label-caps text-on-surface-variant uppercase">Filter:</span>
          
          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-on-surface hover:text-primary">
            <input
              type="checkbox"
              checked={filters.code}
              onChange={() => toggleFilter('code')}
              className="rounded accent-primary"
            />
            <span>Source Code</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-on-surface hover:text-primary">
            <input
              type="checkbox"
              checked={filters.data}
              onChange={() => toggleFilter('data')}
              className="rounded accent-primary"
            />
            <span>Config / Data</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-on-surface hover:text-primary">
            <input
              type="checkbox"
              checked={filters.docs}
              onChange={() => toggleFilter('docs')}
              className="rounded accent-primary"
            />
            <span>Docs</span>
          </label>
        </div>

        {/* Node Search & Limit Control */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-on-surface-variant text-[16px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search file node..."
              className="bg-surface-container-low border border-outline-variant/40 rounded-xl py-1 pl-8 pr-3 text-xs font-code-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary w-44"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-code-sm text-on-surface-variant">
            <span>Show Top:</span>
            <select
              value={nodeLimit}
              onChange={(e) => setNodeLimit(Number(e.target.value))}
              className="bg-surface-container border border-outline-variant/40 text-primary font-bold rounded-lg px-2 py-1 outline-none cursor-pointer"
            >
              <option value={10}>10 Nodes</option>
              <option value={15}>15 Nodes</option>
              <option value={25}>25 Nodes</option>
              <option value={50}>50 Nodes</option>
            </select>
          </div>

          {/* Layout Mode Toggle */}
          <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-outline-variant/30 text-xs">
            <button
              onClick={() => setLayoutMode('grid')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                layoutMode === 'grid' ? 'bg-primary-container text-on-primary-container shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setLayoutMode('layered')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                layoutMode === 'layered' ? 'bg-primary-container text-on-primary-container shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Compact
            </button>
          </div>
        </div>
      </div>

      {/* Graph Area Header Metrics */}
      <div className="px-6 py-2 bg-surface-container-low/50 border-b border-outline-variant/20 flex items-center justify-between text-xs text-on-surface-variant font-code-sm">
        <div className="flex items-center gap-3">
          <span>Showing <strong>{visibleNodes.length}</strong> of <strong>{rawTotalNodes}</strong> file nodes</span>
          <span>•</span>
          <span><strong>{visibleEdges.length}</strong> connected graph edges</span>
        </div>
        <div>
          <span>Graph Layout: Deterministic {layoutMode.toUpperCase()} Matrix</span>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative flex-1 bg-surface-container-lowest overflow-auto flex">
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#3a494b_1px,transparent_1px)] [background-size:20px_20px] opacity-25 pointer-events-none" />

        {/* Canvas & Connected Nodes */}
        <div 
          className="relative p-8"
          style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }}
        >
          
          {/* Connecting SVG Lines */}
          <svg 
            className="absolute inset-0 pointer-events-none"
            width={canvasWidth}
            height={canvasHeight}
            viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          >
            <defs>
              <linearGradient id="edgeLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--color-primary-fixed)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="var(--color-primary-container)" stopOpacity="0.1" />
              </linearGradient>
            </defs>

            {visibleEdges.map((edge, idx) => {
              const srcNode = visibleNodes.find(n => n.id === edge.source);
              const tgtNode = visibleNodes.find(n => n.id === edge.target);

              if (!srcNode || !tgtNode) return null;

              // Connect center of node boxes
              const x1 = srcNode.x + 90;
              const y1 = srcNode.y + 35;
              const x2 = tgtNode.x + 90;
              const y2 = tgtNode.y + 35;

              return (
                <g key={idx}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="url(#edgeLineGrad)"
                    strokeWidth="2"
                    strokeDasharray={edge.type === 'relative' ? undefined : '4'}
                  />
                </g>
              );
            })}
          </svg>

          {/* Render Nodes */}
          {visibleNodes.map((node) => {
            const isSelected = selectedNode?.id === node.id;
            return (
              <div
                key={node.id}
                onClick={() => setSelectedNodeId(node.id)}
                style={{ left: `${node.x}px`, top: `${node.y}px` }}
                className={`absolute cursor-pointer w-48 px-3.5 py-3 rounded-2xl border transition-all duration-150 shadow-xl z-10 space-y-1.5 ${
                  isSelected
                    ? 'bg-surface-container-highest border-primary ring-4 ring-primary/30 scale-105 shadow-primary/20'
                    : 'bg-surface-container border-outline-variant/60 hover:border-primary/60 hover:scale-102'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    isSelected ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-primary'
                  }`}>
                    <span className="material-symbols-outlined text-[16px]">
                      {node.language.includes('JSON') ? 'database' : node.language.includes('Markdown') ? 'description' : 'code'}
                    </span>
                  </div>
                  <div className="overflow-hidden">
                    <div className="font-headline-sm text-xs text-on-surface font-code-sm truncate" title={node.id}>
                      {node.label}
                    </div>
                    <div className="text-[10px] text-on-surface-variant font-code-sm truncate">
                      {node.language}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-code-sm pt-1 border-t border-outline-variant/20">
                  <span className="text-on-surface-variant">{node.lineCount} lines</span>
                  <span className="px-1.5 py-0.2 bg-primary/10 text-primary rounded font-semibold">
                    {node.degree} links
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom-Left Minimap (Viewport Fixed) */}
        <div className="absolute bottom-6 left-6 w-48 h-28 bg-surface-container/90 border border-outline-variant/40 rounded-2xl p-2.5 shadow-2xl backdrop-blur-md flex flex-col justify-between z-20 pointer-events-none">
          <div className="text-[10px] font-label-caps text-on-surface-variant uppercase">Minimap Overview</div>
          <div className="relative w-full h-16 bg-surface-container-lowest rounded-xl border border-outline-variant/20 flex items-center justify-around p-1">
            {visibleNodes.slice(0, 5).map((_, i) => (
              <div key={i} className="w-2 h-2 rounded bg-primary opacity-80" />
            ))}
          </div>
        </div>

        {/* Slide-In Node Detail Drawer (Right Side) */}
        {selectedNode && (
          <div className="w-80 bg-surface-container border-l border-outline-variant/40 p-6 flex flex-col justify-between shadow-2xl z-30 animate-in slide-in-from-right duration-200 shrink-0">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant/30">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[22px]">info</span>
                  <span className="font-headline-sm text-base text-on-surface">Node Details</span>
                </div>
                <span className="px-2 py-0.5 rounded text-xs font-code-sm bg-primary/20 text-primary uppercase">
                  {selectedNode.language}
                </span>
              </div>

              {/* Identity Details */}
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] text-on-surface-variant uppercase font-label-caps">File Label</div>
                  <div className="font-headline-sm text-base text-primary font-code-md truncate" title={selectedNode.id}>
                    {selectedNode.label}
                  </div>
                </div>

                <div className="p-2.5 bg-surface-container-low rounded-xl border border-outline-variant/20 text-xs">
                  <div className="text-[10px] text-on-surface-variant uppercase font-label-caps">Workspace Path</div>
                  <div className="font-code-sm text-on-surface text-xs break-all">{selectedNode.id}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-code-sm">
                  <div className="p-2.5 bg-surface-container-low rounded-xl border border-outline-variant/20">
                    <div className="text-[10px] text-on-surface-variant uppercase font-label-caps">Line Count</div>
                    <div className="font-semibold text-on-surface">{selectedNode.lineCount} lines</div>
                  </div>
                  <div className="p-2.5 bg-surface-container-low rounded-xl border border-outline-variant/20">
                    <div className="text-[10px] text-on-surface-variant uppercase font-label-caps">File Size</div>
                    <div className="font-semibold text-on-surface">{(selectedNode.sizeBytes / 1024).toFixed(1)} KB</div>
                  </div>
                </div>

                {(selectedNode.importsCount > 0 || selectedNode.exportsCount > 0) && (
                  <div className="grid grid-cols-2 gap-2 text-xs font-code-sm">
                    <div className="p-2.5 bg-surface-container-low rounded-xl border border-outline-variant/20">
                      <div className="text-[10px] text-on-surface-variant uppercase font-label-caps">Imports</div>
                      <div className="font-semibold text-primary">{selectedNode.importsCount}</div>
                    </div>
                    <div className="p-2.5 bg-surface-container-low rounded-xl border border-outline-variant/20">
                      <div className="text-[10px] text-on-surface-variant uppercase font-label-caps">Exports</div>
                      <div className="font-semibold text-emerald-300">{selectedNode.exportsCount}</div>
                    </div>
                  </div>
                )}

                <div className="p-2.5 bg-surface-container-low rounded-xl border border-outline-variant/20 text-xs">
                  <div className="text-[10px] text-on-surface-variant uppercase font-label-caps">Graph Connections</div>
                  <div className="font-semibold text-primary">{selectedNode.degree} connected file edges</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-4 border-t border-outline-variant/30">
              <button
                onClick={() => onSelectView('investigate')}
                className="w-full py-2.5 bg-primary-container hover:bg-primary-fixed text-on-primary-container font-semibold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">search_insights</span>
                <span>Inspect in AI Terminal</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
