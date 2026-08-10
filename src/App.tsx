import React, { useState } from 'react';
import { ViewMode, AnalyzeResponse } from './types';
import { analyzeRepositoryApi } from './services/api';
import { SidebarNav } from './components/SidebarNav';
import { TopSearchHeader } from './components/TopSearchHeader';
import { CommandPalette } from './components/CommandPalette';
import { LandingView } from './components/Views/LandingView';
import { InitWorkspaceView } from './components/Views/InitWorkspaceView';
import { AnalysisProgressView } from './components/Views/AnalysisProgressView';
import { OverviewView } from './components/Views/OverviewView';
import { ArchitectureView } from './components/Views/ArchitectureView';
import { InvestigationView } from './components/Views/InvestigationView';
import { ImpactAnalysisView } from './components/Views/ImpactAnalysisView';
import { ChangePlansView } from './components/Views/ChangePlansView';

export function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('landing');
  const [selectedRepo, setSelectedRepo] = useState<string>('aqua-lens-web');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  // Real Backend Analysis State
  const [analysisData, setAnalysisData] = useState<AnalyzeResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [targetRepoUrl, setTargetRepoUrl] = useState<string>('');

  const handleStartAnalysis = async (repoUrl: string) => {
    setTargetRepoUrl(repoUrl);
    setAnalysisError(null);
    setIsAnalyzing(true);
    setCurrentView('analysis-progress');

    const result = await analyzeRepositoryApi(repoUrl);

    if (result.success && result.repository) {
      setAnalysisData(result);
      const repoFullName = `${result.repository.owner}/${result.repository.name}`;
      setSelectedRepo(repoFullName);
      setIsAnalyzing(false);
      setCurrentView('overview');
    } else {
      setIsAnalyzing(false);
      setAnalysisError(result.error || 'Repository analysis failed');
    }
  };

  const isFullPage = currentView === 'landing' || currentView === 'init-workspace' || currentView === 'analysis-progress';

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md antialiased selection:bg-primary/20 selection:text-primary">
      
      {/* Command Palette Modal */}
      <CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectView={(v) => {
          setCurrentView(v);
          setIsSearchOpen(false);
        }}
      />

      {/* Help Modal */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
          <div className="bg-surface-container border border-outline-variant/40 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">help</span>
                <h3 className="font-headline-md text-xl text-on-surface">Aqua Lens Guide</h3>
              </div>
              <button
                onClick={() => setIsHelpOpen(false)}
                className="p-1 hover:bg-surface-variant rounded-lg text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="space-y-3 text-xs text-on-surface-variant leading-relaxed">
              <p><strong>1. Architecture Topology:</strong> Click on graph nodes to inspect dependency metrics, line counts, and import statements.</p>
              <p><strong>2. AI Investigation:</strong> Query the codebase in natural language to inspect AST call stacks and syntax highlighted code.</p>
              <p><strong>3. Impact Analysis:</strong> Evaluate the blast radius of proposed structural refactors before applying changes.</p>
              <p><strong>4. Change Plans:</strong> Review step-by-step Git execution plans with diff previews and schema migration scripts.</p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsHelpOpen(false)}
                className="px-4 py-2 bg-primary-container text-on-primary-container font-semibold text-xs rounded-xl hover:bg-primary-fixed transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Page Views (Landing, Init Workspace, Analysis Progress) */}
      {isFullPage ? (
        <>
          {currentView === 'landing' && (
            <LandingView
              onStartAnalysis={handleStartAnalysis}
              onSelectView={setCurrentView}
            />
          )}

          {currentView === 'init-workspace' && (
            <InitWorkspaceView
              onStartAnalysis={handleStartAnalysis}
              onSelectView={setCurrentView}
              analysisError={analysisError}
              isAnalyzing={isAnalyzing}
            />
          )}

          {currentView === 'analysis-progress' && (
            <AnalysisProgressView
              repoUrl={targetRepoUrl || selectedRepo}
              isAnalyzing={isAnalyzing}
              analysisError={analysisError}
              onCompleteAnalysis={() => setCurrentView('overview')}
              onRetry={() => handleStartAnalysis(targetRepoUrl || 'https://github.com/expressjs/express')}
              onSelectView={setCurrentView}
            />
          )}
        </>
      ) : (
        /* Workspace App Layout with Fixed Sidebar & Header */
        <div className="min-h-screen flex">
          {/* Left Navigation Sidebar */}
          <SidebarNav
            currentView={currentView}
            onSelectView={setCurrentView}
            selectedRepo={selectedRepo}
            onOpenRepoSelector={() => setCurrentView('init-workspace')}
          />

          {/* Top Search Header */}
          <TopSearchHeader
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenHelpModal={() => setIsHelpOpen(true)}
          />

          {/* View Content Area */}
          <main className="flex-1 ml-64 mt-16 p-6 lg:p-8 overflow-y-auto min-h-[calc(100vh-64px)]">
            {currentView === 'overview' && (
              <OverviewView
                repoName={selectedRepo}
                analysisData={analysisData}
                onSelectView={setCurrentView}
              />
            )}

            {currentView === 'architecture' && (
              <ArchitectureView
                analysisData={analysisData}
                onSelectView={setCurrentView}
              />
            )}

            {currentView === 'investigate' && (
              <InvestigationView
                workspaceId={analysisData?.workspaceId}
                analysisData={analysisData}
                onSelectView={setCurrentView}
              />
            )}

            {currentView === 'impact' && (
              <ImpactAnalysisView
                analysisData={analysisData}
                repoUrl={targetRepoUrl || selectedRepo}
                onSelectView={setCurrentView}
              />
            )}

            {currentView === 'plan' && (
              <ChangePlansView
                onSelectView={setCurrentView}
              />
            )}
          </main>
        </div>
      )}

    </div>
  );
}

export default App;
