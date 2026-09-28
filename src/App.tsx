import { FormEvent, lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from './api';
import { Overview, InvestigationView, ImpactView, PlanView } from './components/WorkspaceViews';
import type { FileItem, Job, Workspace } from './types';

type View = 'overview' | 'architecture' | 'investigate' | 'impact' | 'plan';
const GraphExplorer = lazy(() => import('./components/GraphExplorer').then(module => ({ default: module.GraphExplorer })));
const navigation: { id: View; label: string; icon: string; description: string }[] = [
  { id: 'overview', label: 'Overview', icon: '◫', description: 'Your repository briefing' },
  { id: 'architecture', label: 'Architecture', icon: '◇', description: 'Modules and relationships' },
  { id: 'investigate', label: 'Investigation', icon: '⌕', description: 'Questions with evidence' },
  { id: 'impact', label: 'Impact radar', icon: '↗', description: 'Downstream change risk' },
  { id: 'plan', label: 'Change plan', icon: '▤', description: 'Steps before implementation' },
];

function Brand() { return <Link className="brand" to="/" aria-label="Aqua Lens home"><span className="brand-symbol">◈</span><span>Aqua<span className="brand-light">Lens</span></span></Link>; }
export function App() { return <BrowserRouter><Routes><Route path="/" element={<Landing/>}/><Route path="/analysis/:jobId" element={<Progress/>}/><Route path="/workspace/:workspaceId" element={<WorkspacePage/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></BrowserRouter>; }

function Landing() {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy(true);
    try { const { job } = await api.start(url); navigate(`/analysis/${job.id}`); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not start analysis.'); setBusy(false); }
  }
  return <div className="landing-page"><header className="site-header"><Brand/><nav><a href="#how-it-works">How it works</a><span className="header-tag">Public repositories</span></nav></header><main>
    <section className="landing-hero"><div className="hero-copy"><span className="overline"><span className="tiny-star">✦</span> CODEBASE INTELLIGENCE</span><h1>Understand the system <em>behind the code.</em></h1><p>Turn a public GitHub repository into a clear map of modules, dependencies, evidence, and change risk.</p><div className="hero-points"><span>◈ Architecture you can navigate</span><span>◈ Answers tied to source</span><span>◈ Impact before implementation</span></div></div><form className="repo-form" onSubmit={submit}><div className="form-heading"><span className="form-icon">⌘</span><div><strong>Start a new analysis</strong><small>Public GitHub repositories</small></div></div><label htmlFor="repository-url">REPOSITORY URL</label><input id="repository-url" type="url" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://github.com/owner/repository" required aria-invalid={Boolean(error)} aria-describedby={error ? 'url-error' : undefined}/>{error && <p id="url-error" className="error-text" role="alert">{error}</p>}<button type="submit" disabled={busy}>{busy ? 'Starting analysis…' : 'Explore repository'} <span>↗</span></button><div className="sample-repos"><span>TRY A REPOSITORY</span><button type="button" onClick={() => setUrl('https://github.com/expressjs/express')}>expressjs/express</button><button type="button" onClick={() => setUrl('https://github.com/facebook/react')}>facebook/react</button></div><p className="privacy-note">A shallow copy is analyzed temporarily. Your repository is never changed.</p></form></section>
    <section className="landing-proof" id="how-it-works"><div className="section-heading"><span className="overline">FROM REPOSITORY TO UNDERSTANDING</span><h2>Everything you need to orient yourself.</h2></div><div className="proof-grid"><article><span>01 / MAP</span><div className="proof-icon">◇</div><h3>See the architecture</h3><p>Start with readable folder groups. Drill into a file only when you need its exact imports and dependents.</p></article><article><span>02 / INVESTIGATE</span><div className="proof-icon">⌕</div><h3>Ask with evidence</h3><p>Find relevant code and follow every answer back to the source lines that support it.</p></article><article><span>03 / CHANGE</span><div className="proof-icon">↗</div><h3>Assess impact</h3><p>Trace the modules affected by a change, then work from a practical implementation plan.</p></article></div></section>
  </main><footer className="site-footer"><Brand/><span>Source backed insight for public repositories.</span></footer></div>;
}

const stageNames = [
  { id: 'queued', name: 'Prepare', detail: 'Checking repository URL' },
  { id: 'cloning', name: 'Clone', detail: 'Getting a shallow copy' },
  { id: 'scanning', name: 'Scan', detail: 'Reading source files' },
  { id: 'mapping', name: 'Map', detail: 'Linking modules and symbols' },
];
function Progress() {
  const { jobId = '' } = useParams(); const navigate = useNavigate();
  const [job, setJob] = useState<Job>(); const [error, setError] = useState(''); const [elapsed, setElapsed] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => setElapsed(value => value + 1), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    let live = true; let timeout: number;
    const poll = async () => {
      try { const result = await api.job(jobId); if (!live) return; setJob(result.job);
        if (result.job.state === 'succeeded' && result.job.result) { navigate(`/workspace/${result.job.result.workspaceId}`, { replace: true, state: result.job.result }); return; }
        if (result.job.state === 'failed') { setError(result.job.error || 'Analysis failed.'); return; }
        timeout = window.setTimeout(poll, 1000);
      } catch (caught) { if (live) setError(caught instanceof Error ? caught.message : 'The analysis service is unavailable.'); }
    }; void poll(); return () => { live = false; window.clearTimeout(timeout); };
  }, [jobId, navigate]);
  const index = stageNames.findIndex(stage => stage.id === job?.stage);
  return <div className="progress-page"><header className="site-header"><Brand/><Link to="/">Back to home</Link></header><main className="progress-wrap"><div className="progress-head"><span className="overline">REPOSITORY ANALYSIS</span><h1>{error ? 'We could not finish this analysis.' : 'Building your workspace.'}</h1><p>{error || 'We are reading the repository and preparing a clear picture of how its pieces fit together.'}</p></div><div className="progress-panel"><div className="progress-top"><span><span className="live-dot"/> {error ? 'ACTION NEEDED' : 'ANALYSIS IN PROGRESS'}</span><span>{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')} elapsed</span></div><div className="progress-meter"><span style={{ width: `${Math.max(4, job?.progress || 4)}%` }}/></div><div className="progress-value"><strong>{job?.progress || 4}%</strong><span>{stageNames[Math.max(0, index)]?.detail || 'Preparing'}</span></div><div className="stage-grid">{stageNames.map((stage, position) => <div key={stage.id} className={`stage ${position < index ? 'complete' : position === index ? 'active' : ''}`}><span className="stage-number">{position < index ? '✓' : `0${position + 1}`}</span><strong>{stage.name}</strong><small>{stage.detail}</small></div>)}</div>{error && <Link className="primary-link" to="/">Try another repository →</Link>}</div><p className="progress-footnote">Large repositories can take longer. The workspace opens as soon as analysis completes.</p></main></div>;
}

function SourceDrawer({ workspaceId, file, line, onClose }: { workspaceId: string; file: FileItem; line?: number; onClose: () => void }) {
  const [content, setContent] = useState(''); const [error, setError] = useState('');
  useEffect(() => { let live = true; setContent(''); setError(''); api.source(workspaceId, file.path).then(result => { if (live) setContent(result.content); }).catch(caught => { if (live) setError(caught instanceof Error ? caught.message : 'Source unavailable.'); }); return () => { live = false; }; }, [workspaceId, file.path]);
  useEffect(() => { if (content && line) document.getElementById(`source-line-${line}`)?.scrollIntoView({ block: 'center' }); }, [content, line]);
  const lines = content.split('\n'); const start = line ? Math.max(0, line - 150) : 0; const end = Math.min(lines.length, line ? line + 350 : 1000);
  return <div className="drawer-backdrop" onClick={onClose}><aside className="source-drawer" onClick={event => event.stopPropagation()} aria-label="Source preview"><header><div><small>SOURCE PREVIEW · {file.language}</small><h2>{file.path}</h2></div><button onClick={onClose} aria-label="Close source preview">×</button></header><div className="source-body">{error ? <p className="error-text">{error}</p> : content ? <>{start > 0 && <p className="source-truncation">Showing from line {start + 1}</p>}<pre><code>{lines.slice(start, end).map((text, index) => { const number = start + index + 1; return <span id={`source-line-${number}`} className={number === line ? 'cited-line' : ''} key={number}><i>{number}</i>{text}{'\n'}</span>; })}</code></pre>{end < lines.length && <p className="source-truncation">Preview ends at line {end} of {lines.length}.</p>}</> : <p>Loading source…</p>}</div></aside></div>;
}

function WorkspacePage() {
  const { workspaceId = '' } = useParams(); const location = useLocation(); const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<Workspace | null>(location.state as Workspace || null);
  const [error, setError] = useState('');
  const [view, setView] = useState<View>(() => { const candidate = new URLSearchParams(location.search).get('view'); return navigation.some(item => item.id === candidate) ? candidate as View : 'overview'; });
  const [menuOpen, setMenuOpen] = useState(false); const [source, setSource] = useState<{ file: FileItem; line?: number }>(); const [impactFile, setImpactFile] = useState<FileItem>();
  useEffect(() => { let live = true; api.workspace(workspaceId).then(data => { if (live) setWorkspace(data); }).catch(caught => { if (live) setError(caught instanceof Error ? caught.message : 'Workspace unavailable.'); }); return () => { live = false; }; }, [workspaceId]);
  useEffect(() => { const candidate = new URLSearchParams(location.search).get('view'); setView(navigation.some(item => item.id === candidate) ? candidate as View : 'overview'); }, [location.search]);
  useEffect(() => { const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setSource(undefined); setMenuOpen(false); } }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, []);
  if (error) return <div className="workspace-error"><Brand/><h1>Workspace unavailable</h1><p>{error}</p><Link className="primary-link" to="/">Analyze another repository →</Link></div>;
  if (!workspace) return <div className="workspace-loading"><Brand/><p>Opening workspace…</p></div>;
  const changeView = (next: View) => { setView(next); navigate({ pathname: location.pathname, search: `?view=${next}` }); setMenuOpen(false); window.scrollTo(0, 0); };
  const assessImpact = (file: FileItem) => { setImpactFile(file); changeView('impact'); };
  const showSource = (file: FileItem, line?: number) => setSource({ file, line });
  return <div className="workspace-shell"><aside className={`workspace-sidebar ${menuOpen ? 'open' : ''}`}><Brand/><div className="sidebar-label">ACTIVE REPOSITORY</div><button className="repo-switch" onClick={() => navigate('/')}><span className="repo-avatar">{workspace.repository.name.slice(0, 2).toUpperCase()}</span><span><strong>{workspace.repository.owner}/{workspace.repository.name}</strong><small>Switch repository ↗</small></span></button><div className="sidebar-label">EXPLORE</div><nav aria-label="Workspace views">{navigation.map(item => <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => changeView(item.id)}><span className="nav-icon">{item.icon}</span><span><strong>{item.label}</strong><small>{item.description}</small></span></button>)}</nav><div className="sidebar-bottom"><span className="live-dot"/> Temporary workspace <small>Data expires automatically</small></div></aside><div className="workspace-main"><header className="workspace-header"><button className="mobile-menu" aria-label="Open navigation" onClick={() => setMenuOpen(value => !value)}>☰</button><div className="breadcrumb">AQUA LENS <span>/</span> {workspace.repository.name.toUpperCase()} <span>/</span> <b>{navigation.find(item => item.id === view)?.label.toUpperCase()}</b></div><div className="workspace-actions"><span className="workspace-badge"><span className="live-dot"/> Analysis ready</span><button onClick={() => navigate('/')} title="Analyze another repository">New analysis ↗</button></div></header><div className="workspace-body">{view === 'overview' && <Overview workspace={workspace} open={changeView} openSource={showSource}/>} {view === 'architecture' && <Suspense fallback={<div className="surface-card">Opening architecture map…</div>}><GraphExplorer workspace={workspace} onImpact={assessImpact} onSource={showSource}/></Suspense>} {view === 'investigate' && <InvestigationView workspace={workspace} onSource={showSource}/>} {view === 'impact' && <ImpactView workspace={workspace} initialFile={impactFile} onSource={showSource}/>} {view === 'plan' && <PlanView workspace={workspace} onSource={showSource}/>}</div></div>{menuOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)}/>} {source && <SourceDrawer workspaceId={workspace.workspaceId} file={source.file} line={source.line} onClose={() => setSource(undefined)}/>}</div>;
}
