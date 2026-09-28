import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph3D, { type ForceGraphMethods } from 'react-force-graph-3d';
import type { FileItem, Workspace } from '../types';
import { buildFullGraph, connectedIds, fileNodeId, filterGraph, type GraphFilters, type GraphLink, type GraphNode } from './graphModel';

const languageColors: Record<string, string> = {
  TypeScript: '#86b7ff', JavaScript: '#f1cc79', Python: '#92d5bc', Go: '#84d2d8',
  JSON: '#bea9e9', CSS: '#efa7c4', HTML: '#eeaa87', Markdown: '#99b6a1',
};
const packageColor = '#d9bbf2';
const unresolvedColor = '#eaa994';
const idOf = (endpoint: string | GraphNode) => typeof endpoint === 'string' ? endpoint : endpoint.id;
const shortName = (path: string) => path.split('/').pop() || path;

type SceneNode = GraphNode & { vx?: number; vy?: number; vz?: number; fx?: number; fy?: number; fz?: number };
type SceneLink = Omit<GraphLink, 'source' | 'target'> & { source: string | SceneNode; target: string | SceneNode };
type Label = { id: string; text: string; x: number; y: number; kind: GraphNode['kind']; active: boolean };

function useCanvasSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ width: 1000, height: 650 });
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(entries => {
      const rectangle = entries[0]?.contentRect;
      if (rectangle) setSize({ width: Math.max(320, Math.floor(rectangle.width)), height: Math.max(420, Math.floor(rectangle.height)) });
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

export function GraphExplorer({ workspace, onImpact, onSource }: { workspace: Workspace; onImpact: (file: FileItem) => void; onSource: (file: FileItem) => void }) {
  const full = useMemo(() => buildFullGraph(workspace), [workspace]);
  const [filters, setFilters] = useState<GraphFilters>({ folder: '', language: '', showPackages: true });
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>();
  const [hoveredId, setHoveredId] = useState<string>();
  const [labelsMode, setLabelsMode] = useState<'auto' | 'more' | 'off'>('auto');
  const [colorMode, setColorMode] = useState<'folder' | 'language'>(workspace.files.length > 200 ? 'folder' : 'language');
  const [layoutStatus, setLayoutStatus] = useState<'arranging' | 'settled' | 'paused'>('arranging');
  const [paused, setPaused] = useState(false);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods<SceneNode, SceneLink> | undefined>(undefined);
  const initialFit = useRef(false);
  const labelFrame = useRef<number>(0);
  const size = useCanvasSize(canvasRef);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    try { setWebgl(Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))); }
    catch { setWebgl(false); }
  }, []);

  const filtered = useMemo(() => filterGraph(full, filters), [full, filters]);
  const folderColors = useMemo(() => new Map(full.folders.map((folder, index) => [folder, `hsl(${(index * 137.508 + 190) % 360} 65% 70%)`])), [full.folders]);
  const folderCounts = useMemo(() => full.folders.map(folder => ({
    folder,
    count: full.nodes.filter(node => node.kind === 'file' && node.folder === folder).length,
  })).sort((a, b) => b.count - a.count), [full]);
  const scene = useMemo(() => ({
    nodes: filtered.nodes.map(node => node.kind === 'file' ? { ...node } : { ...node, fx: node.x, fy: node.y, fz: node.z }) as SceneNode[],
    links: filtered.links.map(link => ({ ...link })) as SceneLink[],
  }), [filtered]);
  const visibleNodes = useMemo(() => new Map(scene.nodes.map(node => [node.id, node])), [scene]);
  const activeId = hoveredId || selectedId;
  const related = useMemo(() => activeId ? connectedIds(filtered.links, activeId) : undefined, [filtered.links, activeId]);
  const selected = selectedId ? visibleNodes.get(selectedId) : undefined;
  const chosenFile = selected?.kind === 'file' ? workspace.files.find(file => file.path === selected.path) : undefined;
  const incoming = selectedId ? filtered.links.filter(link => link.target === selectedId) : [];
  const outgoing = selectedId ? filtered.links.filter(link => link.source === selectedId) : [];
  const matches = useMemo(() => search.trim() ? scene.nodes.filter(node => `${node.name} ${node.path} ${node.folder}`.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 8) : [], [scene.nodes, search]);
  const packageCount = filtered.nodes.filter(node => node.kind === 'package').length;
  const unresolvedCount = filtered.nodes.filter(node => node.kind === 'unresolved').length;
  const fileCount = filtered.nodes.length - packageCount - unresolvedCount;
  const filteredActive = Boolean(filters.folder || filters.language || !filters.showPackages);

  const updateLabels = useCallback(() => {
    if (labelFrame.current) return;
    labelFrame.current = window.requestAnimationFrame(() => {
      labelFrame.current = 0;
      const graph = graphRef.current;
      const container = canvasRef.current;
      if (!graph || !container) return;
      const camera = graph.camera();
      const position = camera.position;
      const maxLabels = labelsMode === 'more' ? 48 : labelsMode === 'auto' ? 24 : 0;
      const range = scene.nodes.length <= 24 ? Number.POSITIVE_INFINITY : labelsMode === 'more' ? 155 : 85;
      const candidates: { node: SceneNode; distance: number }[] = [];
      for (const node of scene.nodes) {
        if (!Number.isFinite(node.x) || !Number.isFinite(node.y) || !Number.isFinite(node.z)) continue;
        const distance = Math.hypot(position.x - node.x, position.y - node.y, position.z - node.z);
        if (distance < range || node.id === selectedId || node.id === hoveredId) candidates.push({ node, distance });
      }
      candidates.sort((a, b) => (a.node.id === selectedId || a.node.id === hoveredId ? -1 : 0) - (b.node.id === selectedId || b.node.id === hoveredId ? -1 : 0) || a.distance - b.distance);
      const next: Label[] = [];
      for (const { node } of candidates.slice(0, maxLabels + 2)) {
        const point = graph.graph2ScreenCoords(node.x, node.y, node.z);
        if (point.x < 8 || point.y < 8 || point.x > container.clientWidth - 8 || point.y > container.clientHeight - 8) continue;
        next.push({ id: node.id, text: node.name, x: point.x, y: point.y, kind: node.kind, active: node.id === selectedId || node.id === hoveredId });
      }
      setLabels(next);
    });
  }, [scene.nodes, selectedId, hoveredId, labelsMode]);

  useEffect(() => {
    if (!webgl || !graphRef.current) return;
    const controls = graphRef.current.controls() as { addEventListener?: (name: string, listener: () => void) => void; removeEventListener?: (name: string, listener: () => void) => void };
    controls.addEventListener?.('change', updateLabels);
    updateLabels();
    return () => {
      controls.removeEventListener?.('change', updateLabels);
      if (labelFrame.current) window.cancelAnimationFrame(labelFrame.current);
    };
  }, [webgl, updateLabels, scene]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!webgl || !graph) return;
    const anchors = new Map(filtered.nodes.map(node => [node.id, { x: node.x, y: node.y, z: node.z }]));
    graph.d3Force('folderAnchor', (alpha: number) => {
      for (const node of scene.nodes) {
        const anchor = anchors.get(node.id);
        if (!anchor) continue;
        node.vx = (node.vx || 0) + (anchor.x - node.x) * alpha * .2;
        node.vy = (node.vy || 0) + (anchor.y - node.y) * alpha * .2;
        node.vz = (node.vz || 0) + (anchor.z - node.z) * alpha * .2;
      }
    });
    graph.d3ReheatSimulation();
    return () => { graph.d3Force('folderAnchor', null); };
  }, [webgl, filtered, scene]);

  useEffect(() => {
    initialFit.current = false;
    setSelectedId(undefined);
    setHoveredId(undefined);
    setLayoutStatus('arranging');
  }, [scene]);

  const focusNode = useCallback((node: SceneNode) => {
    const graph = graphRef.current;
    if (!graph) return;
    const x = node.x || 0, y = node.y || 0, z = node.z || 0;
    const radius = Math.hypot(x, y, z) || 1;
    const distance = 75;
    graph.cameraPosition(
      { x: x + x / radius * distance, y: y + y / radius * distance, z: z + z / radius * distance + (radius < 2 ? distance : 0) },
      { x, y, z }, 700,
    );
  }, []);

  const fitGraph = useCallback((duration = 650) => {
    const graph = graphRef.current;
    const bounds = graph?.getGraphBbox();
    if (!graph || !bounds) return;
    const center = {
      x: (bounds.x[0] + bounds.x[1]) / 2,
      y: (bounds.y[0] + bounds.y[1]) / 2,
      z: (bounds.z[0] + bounds.z[1]) / 2,
    };
    const radius = Math.max(50, Math.hypot(bounds.x[1] - bounds.x[0], bounds.y[1] - bounds.y[0], bounds.z[1] - bounds.z[0]) / 2);
    const narrowScreenScale = Math.max(1, 760 / size.width);
    graph.cameraPosition({ x: center.x + radius * .7 * narrowScreenScale, y: center.y + radius * .3 * narrowScreenScale, z: center.z + radius * 1.95 * narrowScreenScale }, center, duration);
  }, [size.width]);

  const chooseNode = (id: string, moveCamera = false) => {
    const node = visibleNodes.get(id);
    if (!node) return;
    setSelectedId(id);
    if (moveCamera) focusNode(node);
  };
  const focusFolder = (folder: string) => {
    const nodes = scene.nodes.filter(node => node.kind === 'file' && node.folder === folder);
    if (!nodes.length || !graphRef.current) return;
    const center = nodes.reduce((point, node) => ({ x: point.x + node.x / nodes.length, y: point.y + node.y / nodes.length, z: point.z + node.z / nodes.length }), { x: 0, y: 0, z: 0 });
    const distance = 75 + Math.sqrt(nodes.length) * 3;
    graphRef.current.cameraPosition({ x: center.x + distance * .4, y: center.y + distance * .25, z: center.z + distance }, center, 700);
  };
  const clearFilters = () => setFilters({ folder: '', language: '', showPackages: true });
  const resetView = () => {
    clearFilters();
    setSearch('');
    setSelectedId(undefined);
    setHoveredId(undefined);
    window.setTimeout(() => fitGraph(), 80);
  };
  const toggleLayout = () => {
    if (layoutStatus === 'arranging') {
      setPaused(true);
      setLayoutStatus('paused');
    } else {
      setPaused(false);
      setLayoutStatus('arranging');
      window.setTimeout(() => graphRef.current?.d3ReheatSimulation(), 0);
    }
  };
  const colorOf = (node: SceneNode) => {
    const base = node.kind === 'package' ? packageColor : node.kind === 'unresolved' ? unresolvedColor : colorMode === 'folder' ? folderColors.get(node.folder) || '#9ccab4' : languageColors[node.language || ''] || '#9ccab4';
    if (node.id === selectedId || node.id === hoveredId) return '#f5f8d7';
    if (related && !related.has(node.id)) return '#3a5049';
    return base;
  };
  const linkColor = (link: SceneLink) => {
    const source = idOf(link.source), target = idOf(link.target);
    if (activeId && source !== activeId && target !== activeId) return '#223b36';
    return link.kind === 'package' ? '#9b7ab6' : link.kind === 'unresolved' ? '#a77a6f' : '#76ad99';
  };
  const labelFor = (node: SceneNode) => `${node.kind === 'file' ? node.language : node.kind === 'package' ? 'PACKAGE' : 'UNRESOLVED'} · ${node.path}`;
  const describeNode = (id: string) => visibleNodes.get(id)?.path || id;

  return <section className="explorer explorer-3d">
    <div className="explorer-intro">
      <div><p className="eyebrow">ARCHITECTURE / COMPLETE GRAPH</p><h1>Explore every connection.</h1><p>Each point is a file or imported package. Lines run from the importing file to its dependency. Orbit the map, search for a node, or click one to inspect its connections.</p></div>
      <div className="graph-live-badge"><span className="live-dot"/> FULL GRAPH <strong>3D</strong></div>
    </div>
    <div className="graph-counts" aria-label="Visible graph counts"><div><strong>{fileCount.toLocaleString()}</strong><span>source files</span></div><div><strong>{packageCount.toLocaleString()}</strong><span>packages</span></div><div><strong>{filtered.links.length.toLocaleString()}</strong><span>connections</span></div>{unresolvedCount > 0 && <div><strong>{unresolvedCount}</strong><span>unresolved imports</span></div>}</div>
    <div className="graph-shell">
      <div className="graph-main">
        <div className="graph-toolbar">
          <div className="graph-search"><span aria-hidden="true">⌕</span><input aria-label="Search graph nodes" placeholder="Search files, folders, packages…" value={search} onChange={event => setSearch(event.target.value)}/>{search && <button aria-label="Clear search" onClick={() => setSearch('')}>×</button>}
            {matches.length > 0 && <div className="graph-search-results" role="listbox">{matches.map(node => <button key={node.id} onClick={() => { chooseNode(node.id, true); setSearch(''); }}><span className={`graph-result-dot ${node.kind}`}/><span><strong>{node.name}</strong><small>{node.kind === 'file' ? node.path : node.kind}</small></span></button>)}</div>}
            {search.trim() && matches.length === 0 && <div className="graph-search-results empty">No matching visible nodes.</div>}
          </div>
          <button onClick={resetView}>Fit all</button>
          <button onClick={toggleLayout}>{layoutStatus === 'arranging' ? 'Pause layout' : 'Reflow layout'}</button>
        </div>
        <div className="graph-filter-bar"><label>Folder<select value={filters.folder} onChange={event => setFilters(value => ({ ...value, folder: event.target.value }))}><option value="">All folders</option>{full.folders.map(folder => <option key={folder} value={folder}>{folder}</option>)}</select></label><label>Language<select value={filters.language} onChange={event => setFilters(value => ({ ...value, language: event.target.value }))}><option value="">All languages</option>{full.languages.map(language => <option key={language} value={language}>{language}</option>)}</select></label><label>Color by<select value={colorMode} onChange={event => setColorMode(event.target.value as typeof colorMode)}><option value="folder">Folder</option><option value="language">Language</option></select></label><label>Labels<select value={labelsMode} onChange={event => setLabelsMode(event.target.value as typeof labelsMode)}><option value="auto">Auto</option><option value="more">More</option><option value="off">Selected only</option></select></label><label className="graph-checkbox"><input type="checkbox" checked={filters.showPackages} onChange={event => setFilters(value => ({ ...value, showPackages: event.target.checked }))}/> Packages</label>{filteredActive && <button onClick={clearFilters}>Clear filters</button>}</div>
        <div className="graph-canvas" ref={canvasRef}>
          {webgl === null ? <div className="graph-fallback">Preparing 3D map…</div> : !webgl ? <div className="graph-fallback"><strong>3D rendering is unavailable in this browser.</strong><p>Try enabling hardware acceleration or use the file list below.</p><div className="graph-fallback-list">{scene.nodes.map(node => <button key={node.id} onClick={() => chooseNode(node.id)}>{node.path}</button>)}</div></div> : scene.nodes.length ? <>
            <ForceGraph3D ref={graphRef} graphData={scene} width={size.width} height={size.height} backgroundColor="#0b1518" showNavInfo={false} nodeId="id" nodeLabel={labelFor} nodeColor={colorOf} nodeRelSize={6} nodeVal={node => node.kind === 'file' ? 2.2 : 3.8} nodeResolution={6} linkColor={linkColor} linkWidth={link => activeId && (idOf(link.source) === activeId || idOf(link.target) === activeId) ? 2 : .85} linkOpacity={.75} linkDirectionalArrowLength={link => activeId && (idOf(link.source) === activeId || idOf(link.target) === activeId) ? 4 : 2.5} linkDirectionalArrowRelPos={.8} linkDirectionalArrowResolution={4} warmupTicks={12} cooldownTicks={paused ? 0 : 90} cooldownTime={3500} d3AlphaDecay={.08} d3VelocityDecay={.5} enableNodeDrag={false} onNodeClick={node => chooseNode(node.id)} onNodeHover={node => setHoveredId(node?.id)} onBackgroundClick={() => setSelectedId(undefined)} onEngineTick={updateLabels} onEngineStop={() => { setLayoutStatus(paused ? 'paused' : 'settled'); if (!initialFit.current) { initialFit.current = true; fitGraph(700); } updateLabels(); }}/>
            <div className="graph-label-layer" aria-hidden="true">{labels.map(label => <span key={label.id} className={`graph-node-label ${label.kind} ${label.active ? 'active' : ''}`} style={{ left: label.x, top: label.y }}>{label.text}</span>)}</div>
            <div className="graph-hud"><span className={`graph-status-dot ${layoutStatus}`}/>{layoutStatus === 'arranging' ? 'Arranging nodes' : layoutStatus === 'paused' ? 'Layout paused' : 'Layout settled'}<span className="graph-hud-divider"/>Drag to orbit · right drag to pan · scroll to zoom</div>
          </> : <div className="graph-fallback"><strong>No matching files.</strong><p>Clear the filters to restore the full graph.</p></div>}
        </div>
        <div className="graph-bottom-bar"><span><i className="graph-legend-dot file"/> Files colored by {colorMode} <i className="graph-legend-dot package"/> Package <i className="graph-legend-line"/> Import direction →</span><span>{filteredActive ? 'Filtered view' : 'All analyzed nodes and connections shown'}</span></div>
      </div>
      <aside className={`graph-inspector ${selected ? 'has-selection' : ''}`} aria-label="Node details">
        {selected ? <><div className="graph-inspector-top"><span className={`graph-type-pill ${selected.kind}`}>{selected.kind === 'file' ? selected.language : selected.kind}</span><button aria-label="Close details" onClick={() => setSelectedId(undefined)}>×</button></div><h2>{selected.name}</h2><p className="graph-path">{selected.path}</p>{chosenFile && <div className="graph-detail-metrics"><span>{chosenFile.lines.toLocaleString()} lines</span><span>{selected.folder}</span></div>}
          <div className="graph-detail-section"><div className="graph-section-title">Imports <strong>{outgoing.length}</strong></div><div className="graph-connection-list">{outgoing.length ? outgoing.map(link => <button key={link.id} onClick={() => chooseNode(link.target, true)}><span className="graph-relation-arrow">→</span><span>{describeNode(link.target)}</span></button>) : <p>No outgoing imports in this graph.</p>}</div></div>
          <div className="graph-detail-section"><div className="graph-section-title">Imported by <strong>{incoming.length}</strong></div><div className="graph-connection-list">{incoming.length ? incoming.map(link => <button key={link.id} onClick={() => chooseNode(link.source, true)}><span className="graph-relation-arrow">←</span><span>{describeNode(link.source)}</span></button>) : <p>No analyzed files import this node.</p>}</div></div>
          {chosenFile && <>{chosenFile.symbols.length > 0 && <div className="graph-detail-section"><div className="graph-section-title">Symbols <strong>{chosenFile.symbols.length}</strong></div><div className="graph-symbols">{chosenFile.symbols.map(symbol => <code key={symbol}>{symbol}</code>)}</div></div>}<div className="graph-inspector-actions"><button onClick={() => onSource(chosenFile)}>Preview source ↗</button><button onClick={() => onImpact(chosenFile)}>Assess impact →</button></div></>}
        </> : <><div className="graph-guide-icon">◇</div><p className="eyebrow">EXPLORE THE GRAPH</p><h2>Find the code behind the system.</h2><p className="graph-guide-copy">All analyzed files and imports are already on the map. Search for a filename or package, then click a point to see exactly what it imports and what depends on it.</p><div className="graph-guide-steps"><div><span>01</span> Orbit and zoom to explore clusters</div><div><span>02</span> Search to jump to a node</div><div><span>03</span> Click any point for its connections</div></div><div className="graph-folder-guide"><div className="graph-section-title">Folder clusters <strong>{full.folders.length}</strong></div><div className="graph-folder-list">{folderCounts.map(item => <button key={item.folder} onClick={() => focusFolder(item.folder)} title={`Focus camera on ${item.folder}`}><i style={{ background: colorMode === 'folder' ? folderColors.get(item.folder) : '#8fb8a5' }}/><span>{item.folder}</span><em>{item.count}</em></button>)}</div></div><div className="graph-guide-note"><span className="graph-legend-dot file"/> Files are colored by {colorMode}. Purple points are packages; peach points are unresolved imports.</div></>}
      </aside>
    </div>
  </section>;
}
