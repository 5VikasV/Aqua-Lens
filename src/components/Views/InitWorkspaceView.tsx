import React, { useState } from 'react';
import { sampleRepositories } from '../../data/repositoryPresets';
import { ViewMode } from '../../types';

interface InitWorkspaceViewProps {
  onStartAnalysis: (repoUrl: string) => void;
  onSelectView: (view: ViewMode) => void;
  analysisError?: string | null;
  isAnalyzing?: boolean;
}

export const InitWorkspaceView: React.FC<InitWorkspaceViewProps> = ({
  onStartAnalysis,
  onSelectView,
  analysisError,
  isAnalyzing = false
}) => {
  const [urlInput, setUrlInput] = useState('https://github.com/expressjs/express');
  const [localError, setLocalError] = useState<string | null>(null);

  const parseRepoFromUrl = (url: string) => {
    try {
      const trimmed = url.trim().replace(/\.git$/, '').replace(/\/$/, '');
      const parts = trimmed.split('/');
      if (parts.length >= 5 && parts[2].includes('github.com')) {
        return { owner: parts[3], name: parts[4] };
      }
    } catch (e) {
      // Fallback
    }
    return { owner: 'repository', name: 'target' };
  };

  const currentRepo = parseRepoFromUrl(urlInput);

  const validateUrl = (url: string): boolean => {
    const trimmed = url.trim();
    if (!trimmed) {
      setLocalError('Please enter a GitHub repository URL.');
      return false;
    }
    const regex = /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/;
    if (!regex.test(trimmed)) {
      setLocalError('Invalid URL format. Please enter a URL like https://github.com/owner/repository');
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateUrl(urlInput)) {
      onStartAnalysis(urlInput.trim());
    }
  };

  const selectRecent = (repoUrl: string) => {
    setUrlInput(repoUrl);
    setLocalError(null);
    if (validateUrl(repoUrl)) {
      onStartAnalysis(repoUrl.trim());
    }
  };

  const displayError = localError || analysisError;

  return (
    <div className="min-h-screen bg-background text-on-surface p-6 lg:p-12 flex flex-col items-center justify-center font-body-md">
      <div className="w-full max-w-3xl space-y-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Title & Back */}
        <div className="space-y-3 text-center">
          <button
            onClick={() => onSelectView('landing')}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-container-high border border-outline-variant/30 rounded-lg text-xs font-code-sm text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Home
          </button>
          <h1 className="font-display-lg text-3xl sm:text-4xl text-on-surface">
            Initialize Analysis Workspace
          </h1>
          <p className="text-body-md text-on-surface-variant max-w-xl mx-auto">
            Provide a public GitHub repository URL to build a live dependency graph and analyze codebase structure using the backend engine.
          </p>
        </div>

        {/* Error Alert Box */}
        {displayError && (
          <div className="p-4 bg-error-container/30 border border-error/50 rounded-2xl text-error text-xs flex items-center justify-between shadow-lg animate-in fade-in">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[20px]">error</span>
              <span>{displayError}</span>
            </div>
            <button
              onClick={() => setLocalError(null)}
              className="p-1 hover:bg-error/20 rounded"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

        {/* URL Input Form */}
        <form onSubmit={handleSubmit} className="bg-surface-container border border-outline-variant/40 rounded-3xl p-6 shadow-2xl space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-label-caps text-on-surface-variant uppercase tracking-wider">
              Repository Location
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-4 text-on-surface-variant text-[22px]">
                link
              </span>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setLocalError(null);
                }}
                placeholder="https://github.com/organization/repository"
                disabled={isAnalyzing}
                className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-2xl py-3.5 pl-12 pr-36 font-code-md text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-inner disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={isAnalyzing}
                className="absolute right-2.5 px-5 py-2 bg-primary-container hover:bg-primary-fixed text-on-primary-container font-semibold rounded-xl text-body-sm transition-all flex items-center gap-2 shadow-md disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <span>Start Analysis</span>
                    <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Repository Target Preview Card */}
          <div className="p-5 bg-surface-container-low border border-outline-variant/30 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">folder_open</span>
                <span className="font-headline-sm text-base text-on-surface">
                  {currentRepo.owner} / <span className="text-primary font-bold">{currentRepo.name}</span>
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-code-sm uppercase">
                Ready for Analysis
              </span>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Real-time repository cloning and AST dependency extraction via backend service <code className="text-primary font-code-sm">POST /api/analyze</code>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-code-sm">
              <div className="p-2.5 bg-surface-container rounded-xl border border-outline-variant/20 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[16px]">account_tree</span>
                <span className="text-on-surface">AST Dependency Extraction</span>
              </div>
              <div className="p-2.5 bg-surface-container rounded-xl border border-outline-variant/20 flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-300 text-[16px]">search_insights</span>
                <span className="text-on-surface">Symbol Search & Indexing</span>
              </div>
              <div className="p-2.5 bg-surface-container rounded-xl border border-outline-variant/20 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-300 text-[16px]">psychology</span>
                <span className="text-on-surface">Gemini AI Investigation</span>
              </div>
            </div>
          </div>
        </form>

        {/* Quick Sample Repositories (Presets) */}
        <div className="space-y-4">
          <h3 className="font-headline-sm text-sm text-on-surface-variant uppercase tracking-wider font-label-caps">
            Preset Public Repositories
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(sampleRepositories).map(([key, repo]) => (
              <div 
                key={key}
                onClick={() => selectRecent(repo.url)}
                className="p-4 bg-surface-container border border-outline-variant/30 rounded-2xl hover:border-primary/50 transition-all cursor-pointer flex items-center justify-between group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary font-bold">
                    {repo.language === 'TypeScript' ? 'TS' : 'JS'}
                  </div>
                  <div>
                    <div className="font-headline-sm text-sm text-on-surface group-hover:text-primary transition-colors">
                      {repo.owner} / {repo.name}
                    </div>
                    <div className="text-xs text-on-surface-variant font-code-sm truncate max-w-[200px]">
                      {repo.description}
                    </div>
                  </div>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">
                  chevron_right
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
