import React, { useState } from 'react';
import { ViewMode, AnalyzeResponse, Finding } from '../../types';

interface OverviewViewProps {
  repoName: string;
  analysisData?: AnalyzeResponse | null;
  onSelectView: (view: ViewMode) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ repoName, analysisData, onSelectView }) => {
  const [copiedToast, setCopiedToast] = useState(false);

  // If no repository has been analyzed, display a clean empty state
  if (!analysisData || !analysisData.repository) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-xl mx-auto space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-lg">
          <span className="material-symbols-outlined text-[36px]">dashboard</span>
        </div>
        <div className="space-y-2">
          <h2 className="font-display-lg text-2xl text-on-surface">No Workspace Analyzed Yet</h2>
          <p className="text-body-sm text-on-surface-variant leading-relaxed">
            Analyze a GitHub repository to inspect real language distribution, AST graph topology, package dependencies, file volume, and codebase metrics.
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

  // Derive metrics strictly from real AnalyzeResponse
  const displayRepoName = `${analysisData.repository.owner}/${analysisData.repository.name}`;
  const repoUrl = analysisData.repository.url.replace(/\.git$/, '');

  const handleCopyRepo = () => {
    navigator.clipboard.writeText(repoUrl);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2000);
  };

  const totalFiles = analysisData.fileCount;
  const totalLines = analysisData.metrics.totalLinesOfCode;
  const totalSizeBytes = analysisData.metrics.totalSizeBytes;
  const totalDependencies = analysisData.dependencyCount;

  const npmPackageCount =
    Object.keys(analysisData.packageDependencies?.dependencies || {}).length +
    Object.keys(analysisData.packageDependencies?.devDependencies || {}).length;

  const topLanguages = analysisData.languages?.slice(0, 4) || [];

  // Derive dynamic top directory modules from real analyzed files
  const topModulesMap = new Map<string, number>();
  if (analysisData.files) {
    for (const f of analysisData.files) {
      const parts = f.path.split('/');
      const dirName = parts.length > 1 ? parts[0] : 'root';
      topModulesMap.set(dirName, (topModulesMap.get(dirName) || 0) + 1);
    }
  }

  const topModulesList = Array.from(topModulesMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  // Calculated structure index derived strictly from AST parsing and import resolution metrics
  const parseFailures = analysisData.metrics.parseFailuresCount || 0;
  const unresolvedImports = analysisData.metrics.unresolvedImportsCount || 0;
  const calculatedStructureScore = Math.max(
    60,
    Math.min(98, Math.round(100 - (parseFailures * 5 + unresolvedImports * 2)))
  );

  // Deterministically derive real insights from actual backend metrics
  const realInsights: Finding[] = [];

  if (parseFailures > 0) {
    realInsights.push({
      id: 'insight-parse-failures',
      severity: 'warning',
      category: 'Architecture',
      title: `${parseFailures} AST Parse Exception(s)`,
      description: `${parseFailures} file(s) contained non-standard syntax or syntax constructs during AST parsing.`,
      affectedPath: 'AST Parser'
    });
  }

  if (unresolvedImports > 0) {
    realInsights.push({
      id: 'insight-unresolved-imports',
      severity: 'warning',
      category: 'Architecture',
      title: `${unresolvedImports} Unresolved Import(s)`,
      description: `${unresolvedImports} import statement(s) could not be mapped to relative files or package declarations.`,
      affectedPath: 'Dependency Graph'
    });
  }

  if (npmPackageCount > 0) {
    realInsights.push({
      id: 'insight-package-deps',
      severity: 'info',
      category: 'Architecture',
      title: `${npmPackageCount} Package Dependencies`,
      description: `Manifest contains ${npmPackageCount} package dependencies and ${analysisData.metrics.externalDependenciesCount || 0} external package import references.`,
      affectedPath: 'package.json'
    });
  }

  if (analysisData.metrics.internalDependenciesCount > 0) {
    realInsights.push({
      id: 'insight-internal-coupling',
      severity: 'info',
      category: 'Architecture',
      title: `${analysisData.metrics.internalDependenciesCount} Internal Graph Links`,
      description: `Discovered ${analysisData.metrics.internalDependenciesCount} internal module import edges across ${totalFiles} scanned files.`,
      affectedPath: 'Graph Topology'
    });
  }

  if (totalLines > 0) {
    realInsights.push({
      id: 'insight-codebase-scale',
      severity: 'info',
      category: 'Performance',
      title: `${totalLines.toLocaleString()} Lines of Code`,
      description: `Workspace contains ${totalLines.toLocaleString()} total lines of code (${(totalSizeBytes / 1024).toFixed(0)} KB scanned).`,
      affectedPath: displayRepoName
    });
  }

  return (
    <div className="space-y-8 font-body-md">
      
      {/* Toast Notification */}
      {copiedToast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2 bg-primary text-on-primary font-semibold text-xs rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          Repository URL copied to clipboard!
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-label-caps text-on-surface-variant uppercase tracking-wider mb-1 flex items-center gap-2">
            <span>Project Overview</span>
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-code-sm uppercase">
              Real Backend Data
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="font-display-lg text-2xl sm:text-3xl text-on-surface font-code-md">
              {displayRepoName}
            </h1>
            <button
              onClick={handleCopyRepo}
              className="p-1.5 hover:bg-surface-variant rounded-lg text-on-surface-variant hover:text-primary transition-colors"
              title="Copy repository link"
            >
              <span className="material-symbols-outlined text-[18px]">content_copy</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectView('analysis-progress')}
            className="px-4 py-2 bg-surface-container hover:bg-surface-variant border border-outline-variant/40 rounded-xl text-body-sm text-on-surface transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Re-analyze
          </button>
          <button
            onClick={() => onSelectView('plan')}
            className="px-5 py-2 bg-primary-container hover:bg-primary-fixed text-on-primary-container font-semibold rounded-xl text-body-sm transition-all shadow-md flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export Report
          </button>
        </div>
      </div>

      {/* Top Stats Cards Grid (REAL DATA) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tech Stack Languages */}
        <div className="p-4 bg-surface-container border border-outline-variant/30 rounded-2xl space-y-2">
          <div className="text-xs text-on-surface-variant font-label-caps uppercase">Detected Languages</div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {topLanguages.length > 0 ? (
              topLanguages.map((lang, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-xs font-code-sm"
                  title={`${lang.lineCount.toLocaleString()} lines (${lang.percentage}%)`}
                >
                  {lang.language} ({lang.percentage}%)
                </span>
              ))
            ) : (
              <span className="text-xs text-on-surface-variant italic">No language data</span>
            )}
          </div>
        </div>

        {/* Files Indexed */}
        <div className="p-4 bg-surface-container border border-outline-variant/30 rounded-2xl space-y-1">
          <div className="text-xs text-on-surface-variant font-label-caps uppercase">Files Scanned</div>
          <div className="font-headline-md text-xl text-on-surface font-code-md">
            {totalFiles.toLocaleString()} files
          </div>
          <div className="text-[11px] text-emerald-400 font-code-sm">
            {totalLines.toLocaleString()} Lines of Code ({(totalSizeBytes / 1024).toFixed(0)} KB)
          </div>
        </div>

        {/* Total Dependencies */}
        <div className="p-4 bg-surface-container border border-outline-variant/30 rounded-2xl space-y-1">
          <div className="text-xs text-on-surface-variant font-label-caps uppercase">Total Graph Links</div>
          <div className="font-headline-md text-xl text-on-surface font-code-md">
            {totalDependencies.toLocaleString()} Links
          </div>
          <div className="text-[11px] text-on-surface-variant font-code-sm">
            {npmPackageCount} package dependencies
          </div>
        </div>

        {/* Analysis Time */}
        <div className="p-4 bg-surface-container border border-outline-variant/30 rounded-2xl space-y-1">
          <div className="text-xs text-on-surface-variant font-label-caps uppercase">Scan Duration</div>
          <div className="font-headline-md text-xl text-primary font-code-md">
            {(analysisData.metrics.analysisTimeMs / 1000).toFixed(1)}s
          </div>
          <div className="text-[11px] text-emerald-400 font-code-sm">
            {analysisData.metrics.totalFilesIgnored} files ignored
          </div>
        </div>
      </div>

      {/* Main Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Structure Gauge & Module Breakdown */}
        <div className="lg:col-span-7 space-y-6">
          {/* Health Gauge Box */}
          <div className="p-6 bg-surface-container border border-outline-variant/40 rounded-3xl space-y-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-headline-sm text-lg text-on-surface">Parsed Structure Index</h3>
                <div className="text-[11px] text-on-surface-variant">Metric derived from AST parsing success rate and import resolution</div>
              </div>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-semibold">
                Calculated Metric
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-8">
              {/* Circular Score Gauge SVG */}
              <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="10" className="text-surface-container-high" fill="none" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="var(--color-primary-fixed)"
                    strokeWidth="10"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - (251.2 * calculatedStructureScore) / 100}
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-headline-md text-3xl font-bold text-on-surface font-code-md">
                    {calculatedStructureScore}
                  </span>
                  <span className="text-[10px] text-on-surface-variant uppercase font-label-caps">/ 100</span>
                </div>
              </div>

              {/* Language Breakdown Progress Bars */}
              <div className="flex-1 w-full space-y-3">
                <div className="text-xs font-semibold text-on-surface pb-1">Language Distribution</div>
                {topLanguages.map((lang, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-on-surface-variant font-medium">{lang.language}</span>
                      <span className="text-on-surface font-code-sm font-semibold">{lang.percentage}%</span>
                    </div>
                    <div className="w-full h-2 bg-surface-container-lowest rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${lang.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Codebase Modules */}
          <div className="p-6 bg-surface-container border border-outline-variant/40 rounded-3xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-lg text-on-surface">Top Workspace Directories</h3>
              <span className="text-xs text-on-surface-variant font-code-sm">
                {topModulesList.length} Top Categories
              </span>
            </div>

            <div className="space-y-3">
              {topModulesList.length > 0 ? (
                topModulesList.map(([dir, count], idx) => (
                  <div 
                    key={idx}
                    onClick={() => onSelectView('architecture')}
                    className="p-3.5 bg-surface-container-low hover:bg-surface-variant border border-outline-variant/30 rounded-2xl flex items-center justify-between cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-[20px]">folder</span>
                      <div>
                        <div className="font-semibold text-sm text-on-surface group-hover:text-primary transition-colors font-code-sm">
                          /{dir}
                        </div>
                        <div className="text-xs text-on-surface-variant">{count} files scanned</div>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">
                      arrow_forward
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-4 text-xs text-on-surface-variant text-center">
                  No directory folders detected in root.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Real Insights */}
        <div className="lg:col-span-5 bg-surface-container border border-outline-variant/40 rounded-3xl p-6 space-y-4 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
              <h3 className="font-headline-sm text-lg text-on-surface flex items-center gap-2">
                <span>Codebase Insights</span>
                <span className="px-2 py-0.5 bg-primary/20 text-primary border border-primary/30 rounded text-xs font-code-sm">
                  {realInsights.length} Items
                </span>
              </h3>
            </div>

            <div className="space-y-3 pt-3">
              {realInsights.map((finding) => (
                <div
                  key={finding.id}
                  onClick={() => {
                    if (finding.severity === 'critical' || finding.severity === 'warning') onSelectView('impact');
                    else onSelectView('investigate');
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 group ${
                    finding.severity === 'critical'
                      ? 'bg-error-container/20 border-error/40 hover:border-error'
                      : finding.severity === 'warning'
                      ? 'bg-amber-500/10 border-amber-500/30 hover:border-amber-400'
                      : 'bg-surface-container-low border-outline-variant/30 hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-semibold flex items-center gap-1.5 uppercase font-label-caps ${
                      finding.severity === 'critical' ? 'text-error' : finding.severity === 'warning' ? 'text-amber-300' : 'text-primary'
                    }`}>
                      <span className="material-symbols-outlined text-[16px]">
                        {finding.severity === 'critical' ? 'error' : finding.severity === 'warning' ? 'warning' : 'info'}
                      </span>
                      {finding.category}
                    </span>
                    {finding.affectedPath && (
                      <span className="font-code-sm text-[11px] text-on-surface-variant truncate max-w-[150px]">
                        {finding.affectedPath}
                      </span>
                    )}
                  </div>

                  <h4 className="font-headline-sm text-sm text-on-surface group-hover:text-primary transition-colors">
                    {finding.title}
                  </h4>

                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {finding.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-outline-variant/20 text-center">
            <button
              onClick={() => onSelectView('architecture')}
              className="w-full py-2 bg-surface-variant hover:bg-surface-container-high rounded-xl text-xs font-semibold text-primary transition-colors flex items-center justify-center gap-1"
            >
              <span>Explore Interactive Architecture Topology Graph</span>
              <span className="material-symbols-outlined text-[16px]">account_tree</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
