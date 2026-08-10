import React, { useState } from 'react';
import { Logo } from '../Logo';
import { ViewMode } from '../../types';

interface LandingViewProps {
  onStartAnalysis: (repoUrl: string) => void;
  onSelectView: (view: ViewMode) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onStartAnalysis, onSelectView }) => {
  const [repoInput, setRepoInput] = useState('https://github.com/facebook/react');
  const [activeNode, setActiveNode] = useState<string>('Core.ts');
  const [showPatchApplied, setShowPatchApplied] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (repoInput.trim()) {
      onStartAnalysis(repoInput.trim());
    }
  };

  const handleTryLink = (url: string) => {
    setRepoInput(url);
    onStartAnalysis(url);
  };

  const mapNodes = [
    { id: 'Router.ts', label: 'Router.ts', type: 'Gateway', x: 80, y: 120, status: 'healthy', outgoing: ['Core.ts', 'Utils.ts'] },
    { id: 'Core.ts', label: 'Core.ts', type: 'Service', x: 280, y: 120, status: 'warning', outgoing: ['Store.ts', 'Legacy.ts'] },
    { id: 'Store.ts', label: 'Store.ts', type: 'Database', x: 480, y: 80, status: 'healthy', outgoing: [] },
    { id: 'Utils.ts', label: 'Utils.ts', type: 'Util', x: 280, y: 260, status: 'healthy', outgoing: [] },
    { id: 'Legacy.ts', label: 'Legacy.ts', type: 'Service', x: 480, y: 240, status: 'error', outgoing: [] },
  ];

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col font-body-md selection:bg-primary/30">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-50 h-20 bg-surface-container/80 backdrop-blur-xl border-b border-outline-variant/30 px-6 lg:px-12 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <Logo size="lg" />
          <nav className="hidden md:flex items-center gap-8 text-body-sm font-medium text-on-surface-variant">
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#solutions" className="hover:text-primary transition-colors">Solutions</a>
            <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => onSelectView('init-workspace')}
            className="px-4 py-2 bg-surface-variant hover:bg-surface-container-high rounded-xl text-body-sm text-on-surface transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">folder_open</span>
            Workspaces
          </button>
          <button
            onClick={() => onSelectView('overview')}
            className="px-5 py-2.5 bg-primary-container hover:bg-primary-fixed text-on-primary-container rounded-xl text-body-sm font-semibold transition-all shadow-lg shadow-primary-container/20 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">play_arrow</span>
            Launch App
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 lg:px-12 py-12 lg:py-20 space-y-24">
        
        {/* Hero Section */}
        <section className="text-center space-y-8 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-high border border-outline-variant/50 text-code-sm font-code-sm text-primary">
            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
            <span>v2.4.0-rc.1 • Advanced parsing engine online</span>
          </div>

          <h1 className="font-display-lg text-4xl sm:text-5xl lg:text-6xl text-on-surface tracking-tight leading-tight">
            Understand any codebase <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-fixed via-primary to-surface-tint">
              before you touch it.
            </span>
          </h1>

          <p className="text-body-md sm:text-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
            Precision dependency mapping, blast-radius analysis, and structural refactoring plans for mission-critical software architectures.
          </p>

          {/* Repo Input Box */}
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-3">
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-4 text-on-surface-variant text-[22px]">
                link
              </span>
              <input
                type="text"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                placeholder="https://github.com/organization/repository"
                className="w-full bg-surface-container-low border border-outline-variant/60 rounded-2xl py-4 pl-12 pr-44 font-code-md text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-xl transition-all"
              />
              <button
                type="submit"
                className="absolute right-2.5 px-6 py-2.5 bg-primary-container hover:bg-primary-fixed text-on-primary-container font-semibold rounded-xl text-body-sm transition-all shadow-md flex items-center gap-2"
              >
                <span>Analyze Repository</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-on-surface-variant font-body-sm">
              <span>Try sample repos:</span>
              <button
                type="button"
                onClick={() => handleTryLink('https://github.com/facebook/react')}
                className="text-primary hover:underline font-code-sm"
              >
                facebook/react
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => handleTryLink('https://github.com/vercel/next.js')}
                className="text-primary hover:underline font-code-sm"
              >
                vercel/next.js
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => handleTryLink('https://github.com/tailwindlabs/tailwindcss')}
                className="text-primary hover:underline font-code-sm"
              >
                tailwindlabs/tailwindcss
              </button>
            </div>
          </form>
        </section>

        {/* Live Architecture Map Preview Widget */}
        <section className="bg-surface-container border border-outline-variant/40 rounded-3xl p-6 lg:p-8 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-outline-variant/20">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-[24px]">account_tree</span>
              <div>
                <h3 className="font-headline-sm text-on-surface">Live Architecture Topology</h3>
                <p className="text-xs text-on-surface-variant">Interactive dependency graph parsing sample core modules</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-surface-container-high border border-outline-variant rounded-lg text-xs font-code-sm text-primary">
                Active Node: {activeNode}
              </span>
              <button
                onClick={() => onSelectView('architecture')}
                className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <span>Full Map</span>
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </button>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="relative h-72 sm:h-80 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden flex items-center justify-center p-4">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[radial-gradient(#3a494b_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />

            {/* SVG Connecting Edges */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--color-primary-fixed)" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="var(--color-surface-tint)" stopOpacity="0.2" />
                </linearGradient>
              </defs>
              <line x1="120" y1="120" x2="280" y2="120" stroke="url(#edgeGrad)" strokeWidth="2" strokeDasharray="4" className="animate-pulse" />
              <line x1="280" y1="120" x2="480" y2="80" stroke="url(#edgeGrad)" strokeWidth="2" />
              <line x1="280" y1="120" x2="280" y2="240" stroke="url(#edgeGrad)" strokeWidth="2" />
              <line x1="280" y1="120" x2="480" y2="240" stroke="#ffb4ab" strokeWidth="2" strokeDasharray="3" />
            </svg>

            {/* Map Nodes */}
            <div className="relative w-full max-w-2xl h-full flex items-center justify-around">
              {mapNodes.map((node) => {
                const isSelected = activeNode === node.id;
                return (
                  <div
                    key={node.id}
                    onClick={() => setActiveNode(node.id)}
                    className={`cursor-pointer px-4 py-3 rounded-xl border transition-all duration-200 shadow-lg flex flex-col gap-1 z-10 ${
                      isSelected
                        ? 'bg-surface-container-highest border-primary text-primary scale-105 ring-2 ring-primary/40'
                        : node.status === 'error'
                        ? 'bg-error-container/30 border-error/50 text-error hover:border-error'
                        : 'bg-surface-container-low border-outline-variant/60 text-on-surface hover:border-primary/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">
                        {node.type === 'Gateway' ? 'router' : node.type === 'Database' ? 'database' : 'description'}
                      </span>
                      <span className="font-code-sm text-xs font-semibold">{node.label}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-on-surface-variant font-code-sm">
                      <span>{node.type}</span>
                      {node.status === 'warning' && <span className="text-amber-400">Warning</span>}
                      {node.status === 'error' && <span className="text-error font-semibold">Critical</span>}
                      {node.status === 'healthy' && <span className="text-emerald-400">OK</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section id="features" className="space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="font-headline-md text-2xl text-on-surface">Architectural Rigor by Default</h2>
            <p className="text-body-md text-on-surface-variant">Built for senior engineers, tech leads, and security auditors who require exact codebase visibility.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-surface-container border border-outline-variant/30 rounded-2xl space-y-4 hover:border-primary/40 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[26px]">psychology</span>
              </div>
              <h3 className="font-headline-sm text-on-surface">Deep Codebase Intelligence</h3>
              <p className="text-body-sm text-on-surface-variant leading-relaxed">
                AST parsing and symbol extraction across TypeScript, Go, Python, and Rust. Uncovers hidden dependencies and structural flaws.
              </p>
            </div>

            <div className="p-6 bg-surface-container border border-outline-variant/30 rounded-2xl space-y-4 hover:border-primary/40 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[26px]">hub</span>
              </div>
              <h3 className="font-headline-sm text-on-surface">Interactive Architecture Maps</h3>
              <p className="text-body-sm text-on-surface-variant leading-relaxed">
                Multi-layered topology visualization with real-time latency monitoring, request volume sparklines, and node state inspection.
              </p>
            </div>

            <div className="p-6 bg-surface-container border border-outline-variant/30 rounded-2xl space-y-4 hover:border-primary/40 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[26px]">target</span>
              </div>
              <h3 className="font-headline-sm text-on-surface">Automated Impact Analysis</h3>
              <p className="text-body-sm text-on-surface-variant leading-relaxed">
                Simulate the blast radius before modifying core abstractions. Generate step-by-step Git refactor plans automatically.
              </p>
            </div>
          </div>
        </section>

        {/* Product Preview IDE Code Editor with AI Insights */}
        <section className="bg-surface-container border border-outline-variant/40 rounded-3xl p-6 lg:p-8 space-y-6 shadow-2xl">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="font-headline-md text-2xl text-on-surface">Actionable Insights in Context</h2>
            <p className="text-body-md text-on-surface-variant">
              Aqua Lens integrates directly into your workflow to highlight anti-patterns, circular dependencies, and security vulnerabilities.
            </p>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 overflow-hidden shadow-2xl grid grid-cols-1 lg:grid-cols-12 min-h-[420px]">
            {/* Editor Side */}
            <div className="lg:col-span-7 border-b lg:border-b-0 lg:border-r border-outline-variant/30 flex flex-col">
              <div className="h-10 bg-surface-container-low px-4 flex items-center gap-2 border-b border-outline-variant/20 text-xs font-code-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-primary text-[16px]">description</span>
                <span className="text-on-surface font-semibold">src/services/paymentProcessor.ts</span>
                <span className="ml-auto text-[10px] text-on-surface-variant opacity-60">TypeScript • 28 lines</span>
              </div>
              <div className="p-4 font-code-sm text-xs text-on-surface-variant space-y-1.5 overflow-x-auto flex-1 bg-surface-container-lowest">
                <div className="flex gap-4"><span className="w-6 text-right text-outline opacity-40 select-none">1</span><span className="text-purple-300">import</span> Stripe <span className="text-purple-300">from</span> <span className="text-emerald-300">'stripe'</span>;</div>
                <div className="flex gap-4"><span className="w-6 text-right text-outline opacity-40 select-none">2</span><span className="text-purple-300">import</span> &#123; Logger &#125; <span className="text-purple-300">from</span> <span className="text-emerald-300">'../utils/logger'</span>;</div>
                <div className="flex gap-4"><span className="w-6 text-right text-outline opacity-40 select-none">3</span><span className="text-purple-300">import</span> &#123; db &#125; <span className="text-purple-300">from</span> <span className="text-emerald-300">'../db'</span>;</div>
                <div className="flex gap-4"><span className="w-6 text-right text-outline opacity-40 select-none">4</span></div>
                <div className="flex gap-4"><span className="w-6 text-right text-outline opacity-40 select-none">5</span><span className="text-blue-300">export class</span> <span className="text-amber-200">PaymentProcessor</span> &#123;</div>
                <div className="flex gap-4"><span className="w-6 text-right text-outline opacity-40 select-none">6</span>  <span className="text-blue-300">async</span> <span className="text-amber-200 font-bold underline decoration-amber-400">processPayment</span>(amount: <span className="text-primary">number</span>, userId: <span className="text-primary">string</span>) &#123;</div>
                <div className="flex gap-4 bg-error-container/20 border-l-2 border-error"><span className="w-6 text-right text-error select-none">7</span>    <span className="text-purple-300">const</span> user = <span className="text-purple-300">await</span> db.users.findById(userId);</div>
                <div className="flex gap-4"><span className="w-6 text-right text-outline opacity-40 select-none">8</span>    <span className="text-purple-300">if</span> (!user) <span className="text-purple-300">throw new</span> Error(<span className="text-emerald-300">'User not found'</span>);</div>
                <div className="flex gap-4"><span className="w-6 text-right text-outline opacity-40 select-none">9</span>    </div>
                <div className="flex gap-4 bg-amber-500/10 border-l-2 border-amber-400"><span className="w-6 text-right text-amber-400 select-none">10</span>    <span className="text-slate-400">/* Legacy Stripe call without session boundary */</span></div>
                <div className="flex gap-4 bg-amber-500/10 border-l-2 border-amber-400"><span className="w-6 text-right text-amber-400 select-none">11</span>    <span className="text-purple-300">const</span> intent = <span className="text-purple-300">await</span> <span className="text-primary">this</span>.stripe.paymentIntents.create(&#123;</div>
                <div className="flex gap-4"><span className="w-6 text-right text-outline opacity-40 select-none">12</span>      amount, currency: <span className="text-emerald-300">'usd'</span></div>
                <div className="flex gap-4"><span className="w-6 text-right text-outline opacity-40 select-none">13</span>    &#125;);</div>
                <div className="flex gap-4"><span className="w-6 text-right text-outline opacity-40 select-none">14</span>    <span className="text-purple-300">return</span> intent;</div>
                <div className="flex gap-4"><span className="w-6 text-right text-outline opacity-40 select-none">15</span>  &#125;</div>
                <div className="flex gap-4"><span className="w-6 text-right text-outline opacity-40 select-none">16</span>&#125;</div>
              </div>
            </div>

            {/* AI Insights Side */}
            <div className="lg:col-span-5 bg-surface-container-low p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">auto_awesome</span>
                    <span className="font-headline-sm text-sm text-on-surface">AI Architectural Insights</span>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[10px] font-code-sm">
                    2 Findings
                  </span>
                </div>

                {/* Finding 1 */}
                <div className="p-3.5 bg-surface-container border border-amber-500/40 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">warning</span>
                      High Coupling Detected
                    </span>
                    <span className="text-[10px] text-on-surface-variant font-code-sm">Line 6</span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Class <code className="text-primary font-code-sm">PaymentProcessor</code> imports 14 modules across 3 distinct domain boundaries.
                  </p>
                </div>

                {/* Finding 2 */}
                <div className="p-3.5 bg-surface-container border border-error/40 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-error flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">error</span>
                      Missing Transaction
                    </span>
                    <span className="text-[10px] text-on-surface-variant font-code-sm">Line 7</span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Write operations to <code className="text-primary font-code-sm">db.users</code> occur outside an active database transaction.
                  </p>
                </div>
              </div>

              {/* Action Patch Button */}
              <div className="pt-3 border-t border-outline-variant/20">
                {showPatchApplied ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    <span>Refactoring Plan generated for PaymentProcessor!</span>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setShowPatchApplied(true);
                      setTimeout(() => onSelectView('plan'), 1000);
                    }}
                    className="w-full py-2.5 bg-primary-container hover:bg-primary-fixed text-on-primary-container rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-md"
                  >
                    <span className="material-symbols-outlined text-[18px]">build</span>
                    <span>Generate Refactor Plan (PLAN-8492)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-outline-variant/30 py-8 px-6 lg:px-12 bg-surface-container-lowest mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-on-surface-variant font-body-sm">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span>© 2024 Aqua Lens. Codebase Intelligence Platform.</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-primary transition-colors">Documentation</a>
            <a href="#" className="hover:text-primary transition-colors">Security Audit</a>
            <a href="#" className="hover:text-primary transition-colors font-code-sm text-primary">System Status: 99.99%</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
