import React, { useState, useEffect } from 'react';
import { ViewMode, TerminalLog } from '../../types';

interface AnalysisProgressViewProps {
  repoUrl: string;
  isAnalyzing: boolean;
  analysisError?: string | null;
  onCompleteAnalysis: () => void;
  onRetry: () => void;
  onSelectView: (view: ViewMode) => void;
}

export const AnalysisProgressView: React.FC<AnalysisProgressViewProps> = ({
  repoUrl,
  isAnalyzing,
  analysisError,
  onCompleteAnalysis,
  onRetry,
  onSelectView
}) => {
  const [elapsed, setElapsed] = useState(0);
  const [logs, setLogs] = useState<TerminalLog[]>([
    { id: '1', time: '00:00.1', prefix: 'SYS>', message: 'Connecting to Aqua Lens backend API...' },
    { id: '2', time: '00:00.5', prefix: 'SYS>', message: `Validating GitHub URL: ${repoUrl}` },
    { id: '3', time: '00:01.2', prefix: 'AST>', message: 'Initiating shallow clone (depth: 1)...', type: 'highlight' }
  ]);

  // Real timer elapsed counter
  useEffect(() => {
    if (!isAnalyzing) return;
    const timer = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isAnalyzing]);

  // Log stream feedback
  useEffect(() => {
    if (analysisError) {
      setLogs(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          time: `00:${elapsed < 10 ? '0' + elapsed : elapsed}.0`,
          prefix: 'ERR>',
          message: `Analysis failed: ${analysisError}`,
          type: 'error'
        }
      ]);
    }
  }, [analysisError]);

  const repoName = repoUrl.split('/').slice(-2).join('/') || repoUrl;

  return (
    <div className="min-h-screen bg-background text-on-surface p-6 lg:p-12 flex flex-col space-y-8 font-body-md">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant/30">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary text-[24px]">troubleshoot</span>
            <h1 className="font-display-lg text-2xl sm:text-3xl text-on-surface">Aqua Lens Repository Analysis</h1>
          </div>
          <p className="text-xs text-on-surface-variant font-code-sm">
            target: <span className="text-primary font-semibold">{repoName}</span>
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container border border-outline-variant/40 rounded-xl font-code-sm text-xs">
            <span className={`w-2 h-2 rounded-full ${isAnalyzing ? 'bg-amber-400 animate-ping' : analysisError ? 'bg-error' : 'bg-emerald-400'}`} />
            <span className="text-on-surface-variant">Elapsed:</span>
            <span className="text-primary font-bold">00:{elapsed < 10 ? `0${elapsed}` : elapsed}s</span>
          </div>

          {!isAnalyzing && !analysisError && (
            <button
              onClick={onCompleteAnalysis}
              className="px-5 py-2.5 bg-primary-container hover:bg-primary-fixed text-on-primary-container font-semibold rounded-xl text-xs transition-all shadow-lg flex items-center gap-2"
            >
              <span>View Overview</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        
        {/* Pipeline Stepper (Left) */}
        <div className="lg:col-span-5 bg-surface-container border border-outline-variant/40 rounded-3xl p-6 space-y-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="font-headline-sm text-base text-on-surface mb-6 flex items-center justify-between">
              <span>Backend Analysis Pipeline</span>
              <span className="text-xs font-code-sm text-primary">
                {isAnalyzing ? 'Processing...' : analysisError ? 'Failed' : 'Completed'}
              </span>
            </h3>

            {/* Error Banner */}
            {analysisError && (
              <div className="p-4 mb-6 bg-error-container/30 border border-error/50 rounded-2xl text-error text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 font-semibold">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>Analysis Failed</span>
                </div>
                <p className="text-[11px] leading-relaxed text-on-surface-variant">
                  {analysisError}
                </p>
                <div className="pt-2 flex gap-2">
                  <button
                    onClick={onRetry}
                    className="px-3 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-semibold hover:bg-primary-fixed transition-colors"
                  >
                    Retry Analysis
                  </button>
                  <button
                    onClick={() => onSelectView('init-workspace')}
                    className="px-3 py-1.5 bg-surface-variant text-on-surface rounded-lg text-xs hover:bg-surface-container-high transition-colors"
                  >
                    Back to Workspaces
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-6 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-outline-variant/30">
              {/* Step 1 */}
              <div className="relative flex items-start gap-4 z-10">
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500 flex items-center justify-center font-code-sm text-xs">
                  <span className="material-symbols-outlined text-[16px]">check</span>
                </div>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-on-surface">Validating URL & Request</div>
                  <div className="text-[11px] font-code-sm text-on-surface-variant">{repoUrl}</div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative flex items-start gap-4 z-10">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-code-sm text-xs border ${
                  isAnalyzing ? 'bg-primary/20 text-primary border-primary animate-pulse ring-4 ring-primary/20' : analysisError ? 'bg-error/20 text-error border-error' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                }`}>
                  {isAnalyzing ? (
                    <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                  ) : analysisError ? (
                    '!'
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-on-surface">Shallow Cloning Repository</div>
                  <div className="text-[11px] font-code-sm text-on-surface-variant">git clone --depth 1 (isolated workspace)</div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative flex items-start gap-4 z-10">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-code-sm text-xs border ${
                  isAnalyzing ? 'bg-primary/20 text-primary border-primary' : analysisError ? 'bg-surface-container-high text-on-surface-variant border-outline-variant' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                }`}>
                  {isAnalyzing ? '3' : analysisError ? '3' : <span className="material-symbols-outlined text-[16px]">check</span>}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-on-surface">Scanning Files & AST Imports</div>
                  <div className="text-[11px] font-code-sm text-on-surface-variant">Filtering binaries, node_modules, dist</div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="relative flex items-start gap-4 z-10">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-code-sm text-xs border ${
                  isAnalyzing ? 'bg-surface-container-high text-on-surface-variant border-outline-variant' : analysisError ? 'bg-surface-container-high text-on-surface-variant border-outline-variant' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                }`}>
                  {isAnalyzing ? '4' : analysisError ? '4' : <span className="material-symbols-outlined text-[16px]">check</span>}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-on-surface">Constructing Dependency Graph</div>
                  <div className="text-[11px] font-code-sm text-on-surface-variant">Mapping file nodes & relative edge links</div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-outline-variant/20 flex items-center justify-between">
            <button
              onClick={() => onSelectView('init-workspace')}
              className="text-xs text-on-surface-variant hover:text-error flex items-center gap-1 font-body-sm"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Cancel & Return
            </button>
            <span className="text-xs text-on-surface-variant font-code-sm">Backend Engine v1.0</span>
          </div>
        </div>

        {/* Intelligence Feed Terminal (Right) */}
        <div className="lg:col-span-7 bg-surface-container-lowest border border-outline-variant/50 rounded-3xl overflow-hidden flex flex-col shadow-2xl font-code-sm">
          {/* Terminal Header */}
          <div className="h-12 bg-surface-container-low px-4 flex items-center justify-between border-b border-outline-variant/30">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-3 text-xs text-on-surface font-semibold">Backend Live Feed Terminal</span>
            </div>
            <div className="text-[11px] text-on-surface-variant font-code-sm">
              {isAnalyzing ? 'LIVE API REQUEST' : analysisError ? 'ERROR' : 'IDLE'}
            </div>
          </div>

          {/* Terminal Logs Output */}
          <div className="p-4 flex-1 overflow-y-auto max-h-[500px] space-y-2 text-xs font-code-sm bg-surface-container-lowest">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2.5 hover:bg-surface-container/20 px-1 py-0.5 rounded">
                <span className="text-outline opacity-60 text-[11px] select-none">{log.time}</span>
                <span className={`font-bold select-none ${
                  log.prefix === 'SYS>' ? 'text-primary' : log.prefix === 'AST>' ? 'text-purple-300' : 'text-error'
                }`}>
                  {log.prefix}
                </span>
                <span className={`flex-1 leading-relaxed ${
                  log.type === 'error' ? 'text-error font-medium' : log.type === 'highlight' ? 'text-primary font-medium' : 'text-on-surface/90'
                }`}>
                  {log.message}
                </span>
              </div>
            ))}
            {isAnalyzing && (
              <div className="flex items-center gap-2 text-primary pt-2 animate-pulse">
                <span>&gt; Waiting for backend response...</span>
                <span className="w-2 h-4 bg-primary inline-block" />
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
