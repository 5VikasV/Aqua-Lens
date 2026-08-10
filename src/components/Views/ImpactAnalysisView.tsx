import React, { useState, useEffect, useMemo } from 'react';
import { ViewMode, AnalyzeResponse, ImpactAnalysisResult, ImpactAffectedFile } from '../../types';
import { analyzeImpactApi } from '../../services/api';

interface ImpactAnalysisViewProps {
  analysisData?: AnalyzeResponse | null;
  repoUrl?: string;
  onSelectView: (view: ViewMode) => void;
}

export const ImpactAnalysisView: React.FC<ImpactAnalysisViewProps> = ({
  analysisData,
  repoUrl,
  onSelectView
}) => {
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [impactResult, setImpactResult] = useState<ImpactAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDetailFile, setSelectedDetailFile] = useState<ImpactAffectedFile | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const availableFiles = useMemo(() => analysisData?.files || [], [analysisData]);

  // Keep target selection synchronized with available files
  useEffect(() => {
    if (availableFiles.length > 0) {
      if (!selectedTarget || !availableFiles.some(f => f.path === selectedTarget)) {
        setSelectedTarget(availableFiles[0].path);
      }
    } else {
      setSelectedTarget('');
      setImpactResult(null);
    }
  }, [availableFiles]);

  // Fetch real AST impact analysis from backend API
  const fetchImpact = async (targetPath: string) => {
    if (!targetPath || !analysisData) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await analyzeImpactApi({
        repositoryUrl: repoUrl,
        graph: analysisData.dependencyGraph,
        files: analysisData.files,
        targetPath
      });

      setIsLoading(false);
      if (res.success) {
        setImpactResult(res);
        setSelectedDetailFile(null);
      } else {
        setError(res.error || 'Failed to analyze blast radius for the selected target.');
        setImpactResult(null);
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'An error occurred while connecting to the backend server.');
      setImpactResult(null);
    }
  };

  useEffect(() => {
    if (selectedTarget && analysisData) {
      fetchImpact(selectedTarget);
    }
  }, [selectedTarget, analysisData]);

  const handleShare = () => {
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Filtered options for target selection
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return availableFiles;
    const q = searchQuery.toLowerCase();
    return availableFiles.filter(f => f.path.toLowerCase().includes(q));
  }, [availableFiles, searchQuery]);

  // Risk Level badge styling helper
  const getRiskBadgeStyle = (risk?: string) => {
    switch (risk) {
      case 'CRITICAL':
        return 'bg-error-container/30 text-error border-error/40';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'MEDIUM':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      case 'LOW':
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  // Handle file selection for detailed inspection
  const handleSelectFile = (file: ImpactAffectedFile) => {
    setSelectedDetailFile(file);
  };

  const handleSelectFileByPath = (path: string) => {
    const found = impactResult?.affectedFiles.find(f => f.path === path);
    if (found) {
      setSelectedDetailFile(found);
    } else {
      // Find metric from analysisData if present
      const metric = availableFiles.find(f => f.path === path);
      setSelectedDetailFile({
        path,
        depth: impactResult?.directDependents.some(d => d.path === path) ? 1 : 2,
        isDirect: impactResult?.directDependents.some(d => d.path === path) || false,
        language: metric?.language || 'Code',
        lineCount: metric?.lineCount || 0
      });
    }
  };

  // Capped visible nodes in visual canvas for high performance (Max 6 per section)
  const displayDirects = useMemo(() => {
    return impactResult?.directDependents.slice(0, 6) || [];
  }, [impactResult]);

  const hiddenDirectCount = (impactResult?.statistics.directCount || 0) - displayDirects.length;

  const displayIndirects = useMemo(() => {
    return impactResult?.indirectDependents.slice(0, 6) || [];
  }, [impactResult]);

  const hiddenIndirectCount = (impactResult?.statistics.indirectCount || 0) - displayIndirects.length;

  // Requirement 8: Handle no repository analyzed
  if (!analysisData || availableFiles.length === 0) {
    return (
      <div className="space-y-8 font-body-md">
        <div className="flex flex-col items-center justify-center p-12 bg-surface-container border border-outline-variant/40 rounded-3xl space-y-6 text-center shadow-xl">
          <div className="p-4 bg-surface-container-high rounded-full text-on-surface-variant">
            <span className="material-symbols-outlined text-[40px]">account_tree</span>
          </div>
          <div className="max-w-md space-y-2">
            <h2 className="font-display-lg text-2xl text-on-surface">No Repository Analyzed</h2>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              No repository analysis data is currently loaded. Please initialize workspace and run repository analysis to evaluate real AST blast radius metrics.
            </p>
          </div>
          <button
            onClick={() => onSelectView('init-workspace')}
            className="px-6 py-2.5 bg-primary text-on-primary font-semibold rounded-xl text-xs transition-all shadow-md flex items-center gap-2 hover:opacity-90"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Initialize & Analyze Repository
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-body-md">
      
      {/* Toast Alert */}
      {copiedLink && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2 bg-primary text-on-primary font-semibold text-xs rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <span className="material-symbols-outlined text-[18px]">share</span>
          Impact Analysis link copied to clipboard!
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 border-b border-outline-variant/30">
        <div className="w-full lg:w-auto space-y-2">
          <div className="text-xs font-label-caps text-on-surface-variant uppercase tracking-wider mb-1 flex items-center gap-2">
            <span>Blast Radius Evaluation</span>
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-code-sm uppercase">
              Live AST Backend
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <h1 className="font-display-lg text-xl sm:text-2xl text-on-surface shrink-0">
              Impact Analysis:
            </h1>
            
            {/* Real Target Selector from analysisData.files */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value)}
                className="bg-surface-container border border-primary/40 text-primary font-code-md text-sm sm:text-base rounded-xl px-3 py-1.5 outline-none cursor-pointer hover:border-primary max-w-full sm:max-w-md truncate"
              >
                {filteredFiles.map((file) => (
                  <option key={file.path} value={file.path}>
                    {file.path} ({file.lineCount} LOC)
                  </option>
                ))}
              </select>
              {availableFiles.length > 5 && (
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-2.5 text-[16px] text-on-surface-variant">search</span>
                  <input
                    type="text"
                    placeholder="Filter target..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-surface-container border border-outline-variant/40 text-on-surface font-code-sm text-xs rounded-xl pl-8 pr-3 py-1.5 outline-none focus:border-primary w-full sm:w-44"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end lg:self-auto shrink-0">
          <button
            onClick={handleShare}
            className="px-4 py-2 bg-surface-container hover:bg-surface-variant border border-outline-variant/40 rounded-xl text-body-sm text-on-surface transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">share</span>
            Share Report
          </button>
          <button
            onClick={() => onSelectView('plan')}
            className="px-5 py-2 bg-primary-container hover:bg-primary-fixed text-on-primary-container font-semibold rounded-xl text-body-sm transition-all shadow-md flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">checklist_rtl</span>
            Generate Refactor Plan
          </button>
        </div>
      </div>

      {/* Main Grid: Blast Radius Canvas (Left) & Affected Files (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Dependency Blast Map Canvas */}
        <div className="lg:col-span-7 bg-surface-container border border-outline-variant/40 rounded-3xl p-6 lg:p-8 space-y-6 shadow-2xl relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-outline-variant/20 gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-error text-[22px]">target</span>
                <span className="font-headline-sm text-base text-on-surface">Blast Radius Visualization</span>
              </div>
              
              {impactResult && (
                <div className="flex flex-wrap items-center gap-2 text-xs font-code-sm">
                  <span className={`px-2.5 py-0.5 rounded-full font-semibold border ${getRiskBadgeStyle(impactResult.riskLevel)}`}>
                    {impactResult.riskLevel} RISK
                  </span>
                  <span className="px-2.5 py-0.5 bg-surface-container-high text-on-surface-variant rounded-full">
                    {impactResult.statistics.directCount} Direct
                  </span>
                  <span className="px-2.5 py-0.5 bg-surface-container-high text-on-surface-variant rounded-full">
                    {impactResult.statistics.indirectCount} Indirect
                  </span>
                </div>
              )}
            </div>

            {/* Canvas Area */}
            {isLoading ? (
              /* Requirement 8: Loading State */
              <div className="min-h-[380px] my-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 flex flex-col items-center justify-center p-8 space-y-4">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <div className="text-xs text-on-surface-variant font-code-sm text-center">
                  Calculating AST Blast Radius for <strong className="text-primary">{selectedTarget}</strong>...
                </div>
              </div>
            ) : error ? (
              /* Requirement 8: Target Not Found / API Failure */
              <div className="min-h-[380px] my-4 bg-surface-container-lowest rounded-2xl border border-error/30 flex flex-col items-center justify-center p-8 space-y-4 text-center">
                <span className="material-symbols-outlined text-error text-[36px]">warning</span>
                <div className="space-y-1 max-w-md">
                  <h4 className="font-headline-sm text-sm text-on-surface">Impact Analysis Failed</h4>
                  <p className="text-xs text-on-surface-variant font-code-sm">{error}</p>
                </div>
                <button
                  onClick={() => fetchImpact(selectedTarget)}
                  className="px-4 py-2 bg-surface-variant hover:bg-surface-container-high rounded-xl text-xs font-semibold text-primary transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px]">refresh</span>
                  Retry Analysis
                </button>
              </div>
            ) : impactResult ? (
              /* Requirement 6: Target -> Direct Dependents -> Indirect Dependents Visual Flow */
              <div className="relative min-h-[380px] my-4 p-6 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 flex flex-col items-center justify-start space-y-6 overflow-hidden">
                
                {/* Layer 0: Center Target Node */}
                <div className="flex flex-col items-center space-y-2 text-center z-10 w-full max-w-md">
                  <div className="text-[10px] uppercase font-label-caps tracking-wider text-error font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">adjust</span>
                    Target File
                  </div>
                  <div 
                    onClick={() => setSelectedDetailFile(null)}
                    className="p-3.5 bg-error-container/20 border-2 border-error/80 text-on-surface rounded-2xl shadow-xl w-full flex items-center justify-between cursor-pointer hover:bg-error-container/30 transition-all"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="material-symbols-outlined text-error text-[20px]">description</span>
                      <div className="text-left truncate">
                        <div className="font-code-md text-sm font-bold text-error truncate">{impactResult.target?.path}</div>
                        <div className="text-[11px] text-on-surface-variant font-code-sm">
                          {impactResult.target?.language} • {impactResult.target?.lineCount} lines
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-error/20 text-error rounded text-[10px] font-code-sm font-semibold shrink-0">
                      Source
                    </span>
                  </div>
                </div>

                {/* Arrow Connector to Direct Dependents */}
                <div className="flex flex-col items-center justify-center text-outline-variant">
                  <div className="w-0.5 h-5 bg-error/40"></div>
                  <span className="material-symbols-outlined text-error text-[18px] -mt-1">expand_more</span>
                  <span className="text-[10px] text-on-surface-variant font-code-sm uppercase tracking-wider">
                    Direct Dependents ({impactResult.statistics.directCount})
                  </span>
                </div>

                {/* Requirement 8: Zero Affected Files Handling */}
                {impactResult.affectedFiles.length === 0 ? (
                  <div className="w-full p-4 bg-surface-container/50 border border-outline-variant/30 rounded-2xl text-center space-y-1 z-10">
                    <div className="text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1.5 font-code-sm">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      Isolated File (Zero Dependent Files Impacted)
                    </div>
                    <p className="text-[11px] text-on-surface-variant">
                      No other files in this repository import or depend on this file directly or indirectly.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Layer 1: Direct Dependents */}
                    <div className="w-full space-y-2 z-10">
                      {impactResult.directDependents.length === 0 ? (
                        <div className="p-3 bg-surface-container/50 border border-outline-variant/30 rounded-xl text-center text-xs text-on-surface-variant font-code-sm">
                          No direct dependents found
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {displayDirects.map((dep) => (
                            <div
                              key={dep.path}
                              onClick={() => handleSelectFileByPath(dep.path)}
                              className={`p-3 rounded-xl border text-xs font-code-sm cursor-pointer transition-all flex items-center justify-between ${
                                selectedDetailFile?.path === dep.path
                                  ? 'bg-primary/20 border-primary text-primary shadow-lg ring-1 ring-primary'
                                  : 'bg-surface-container border-error/40 text-on-surface hover:border-error hover:bg-surface-container-high'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="material-symbols-outlined text-error text-[16px]">subdirectory_arrow_right</span>
                                <span className="truncate font-medium">{dep.path}</span>
                              </div>
                              <span className="px-1.5 py-0.5 bg-error/10 text-error rounded text-[10px] shrink-0 font-semibold">
                                Lvl 1
                              </span>
                            </div>
                          ))}
                          {hiddenDirectCount > 0 && (
                            <div className="p-2.5 bg-surface-container-high border border-outline-variant/30 rounded-xl text-center text-xs text-on-surface-variant font-code-sm sm:col-span-2">
                              + {hiddenDirectCount} more direct dependents (see manifest)
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Arrow Connector to Indirect Dependents */}
                    {impactResult.indirectDependents.length > 0 && (
                      <>
                        <div className="flex flex-col items-center justify-center text-outline-variant">
                          <div className="w-0.5 h-5 bg-outline-variant/60"></div>
                          <span className="material-symbols-outlined text-on-surface-variant text-[18px] -mt-1">expand_more</span>
                          <span className="text-[10px] text-on-surface-variant font-code-sm uppercase tracking-wider">
                            Indirect Dependents ({impactResult.statistics.indirectCount})
                          </span>
                        </div>

                        {/* Layer 2+: Indirect Dependents */}
                        <div className="w-full space-y-2 z-10">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {displayIndirects.map((dep) => (
                              <div
                                key={dep.path}
                                onClick={() => handleSelectFileByPath(dep.path)}
                                className={`p-3 rounded-xl border text-xs font-code-sm cursor-pointer transition-all flex items-center justify-between ${
                                  selectedDetailFile?.path === dep.path
                                    ? 'bg-primary/20 border-primary text-primary shadow-lg ring-1 ring-primary'
                                    : 'bg-surface-container-low border-outline-variant/40 text-on-surface-variant hover:border-outline-variant hover:bg-surface-container'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <span className="material-symbols-outlined text-on-surface-variant text-[16px]">account_tree</span>
                                  <span className="truncate">{dep.path}</span>
                                </div>
                                <span className="px-1.5 py-0.5 bg-surface-container-high text-on-surface-variant rounded text-[10px] shrink-0">
                                  Lvl {dep.depth}
                                </span>
                              </div>
                            ))}
                            {hiddenIndirectCount > 0 && (
                              <div className="p-2.5 bg-surface-container-high border border-outline-variant/30 rounded-xl text-center text-xs text-on-surface-variant font-code-sm sm:col-span-2">
                                + {hiddenIndirectCount} more indirect dependents (see manifest)
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            ) : null}
          </div>

          {/* Canvas Footer Summary Bar */}
          {impactResult && (
            <div className="p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs text-on-surface-variant flex items-center justify-between flex-wrap gap-2">
              <span>Total Affected: <strong>{impactResult.statistics.totalAffected} files</strong></span>
              <span>Max Propagation Depth: <strong>Level {impactResult.statistics.maxDepth}</strong></span>
              <span className="font-code-sm text-primary font-semibold">AST Graph Evaluated</span>
            </div>
          )}
        </div>

        {/* Affected Files Sidebar */}
        <div className="lg:col-span-5 bg-surface-container border border-outline-variant/40 rounded-3xl p-6 space-y-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-headline-sm text-lg text-on-surface flex items-center justify-between">
              <span>Affected File Manifest</span>
              <span className="text-xs font-code-sm text-on-surface-variant">
                {impactResult?.affectedFiles.length || 0} Files
              </span>
            </h3>

            {/* Requirement 9: Detail Inspector Card when a file is clicked */}
            {selectedDetailFile && (
              <div className="p-4 bg-surface-container-high border border-primary/50 rounded-2xl space-y-2 animate-in fade-in zoom-in-95 duration-150 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">info</span>
                    <span className="font-semibold text-xs text-primary font-code-sm uppercase tracking-wider">
                      Selected File Inspector
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedDetailFile(null)}
                    className="p-0.5 hover:bg-surface-variant rounded text-on-surface-variant hover:text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
                
                <div className="font-code-sm text-xs font-bold text-on-surface break-all">
                  {selectedDetailFile.path}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-code-sm text-on-surface-variant pt-1 border-t border-outline-variant/20">
                  <div>
                    <span className="text-on-surface-variant/70">Dependency Depth:</span>{' '}
                    <strong className="text-on-surface">Level {selectedDetailFile.depth}</strong>
                  </div>
                  <div>
                    <span className="text-on-surface-variant/70">Impact Type:</span>{' '}
                    <strong className={selectedDetailFile.isDirect ? 'text-error' : 'text-on-surface'}>
                      {selectedDetailFile.isDirect ? 'Direct Dependency' : 'Indirect Effect'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-on-surface-variant/70">Language:</span>{' '}
                    <strong className="text-on-surface">{selectedDetailFile.language}</strong>
                  </div>
                  <div>
                    <span className="text-on-surface-variant/70">Line Count:</span>{' '}
                    <strong className="text-on-surface">{selectedDetailFile.lineCount} lines</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Requirement 9: Clickable affected files list */}
            <div className="space-y-2 overflow-y-auto max-h-[400px] pr-1">
              {!impactResult || impactResult.affectedFiles.length === 0 ? (
                <div className="p-6 bg-surface-container-low border border-outline-variant/30 rounded-2xl text-center text-xs text-on-surface-variant font-code-sm">
                  {isLoading ? 'Loading manifest...' : 'No files affected by selected target.'}
                </div>
              ) : (
                impactResult.affectedFiles.map((file) => {
                  const isSelected = selectedDetailFile?.path === file.path;
                  return (
                    <div
                      key={file.path}
                      onClick={() => handleSelectFile(file)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-primary/20 border-primary text-primary shadow-md ring-1 ring-primary'
                          : file.isDirect
                          ? 'bg-error-container/20 border-error/40 text-error hover:border-error hover:bg-error-container/30'
                          : 'bg-surface-container-low border-outline-variant/30 text-on-surface hover:border-outline-variant hover:bg-surface-container-high'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <span className="material-symbols-outlined text-[18px]">
                          {file.isDirect ? 'warning' : 'account_tree'}
                        </span>
                        <div className="truncate">
                          <div className="font-code-sm text-xs font-semibold truncate">{file.path}</div>
                          <div className="text-[10px] opacity-70 font-code-sm">
                            {file.isDirect ? 'Direct Dependency (Critical)' : `Indirect Effect (Level ${file.depth})`}
                          </div>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-code-sm uppercase shrink-0 ${
                        file.isDirect ? 'bg-error/20 text-error font-semibold' : 'bg-surface-container-high text-on-surface-variant'
                      }`}>
                        Lvl {file.depth}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onSelectView('plan')}
              className="w-full py-2.5 bg-primary-container hover:bg-primary-fixed text-on-primary-container font-semibold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">checklist_rtl</span>
              <span>Open Refactor Execution Plan</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

