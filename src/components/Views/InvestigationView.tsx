import React, { useState } from 'react';
import { AnalyzeResponse, InvestigateClaim, InvestigateEvidence, ViewMode } from '../../types';
import { analyzeInvestigationApi } from '../../services/api';

interface InvestigationViewProps {
  onSelectView: (view: ViewMode) => void;
  workspaceId?: string;
  analysisData?: AnalyzeResponse | null;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  claims?: InvestigateClaim[];
  evidence?: InvestigateEvidence[];
  referencedFiles?: string[];
  metadata?: {
    totalFilesRetrieved: number;
    totalLinesRetrieved: number;
    totalCharactersRetrieved: number;
    queryTermsUsed: string[];
  };
  error?: string;
}

export const InvestigationView: React.FC<InvestigationViewProps> = ({
  onSelectView,
  workspaceId,
  analysisData
}) => {
  const [queryInput, setQueryInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    if (!workspaceId) return [];
    return [
      {
        id: 'welcome-1',
        role: 'assistant',
        text: `Workspace \`${workspaceId}\` indexed. Ask any query about code logic, application flow, routing, or symbol definitions.`,
        confidence: 'HIGH'
      }
    ];
  });
  const [isTyping, setIsTyping] = useState(false);

  // Real Code Inspector Evidence State
  const [activeEvidenceList, setActiveEvidenceList] = useState<InvestigateEvidence[]>([]);
  const [activeEvidenceId, setActiveEvidenceId] = useState<string | null>(null);

  const sampleQuestions = [
    "How does Express create an application?",
    "Where is routing implemented?",
    "How are request query parameters parsed?"
  ];

  const handleSendQuery = async (e?: React.FormEvent, overrideQuery?: string) => {
    if (e) e.preventDefault();
    const queryToSubmit = (overrideQuery || queryInput).trim();
    if (!queryToSubmit || isTyping || !workspaceId) return;

    const userMsgId = `user-${Date.now()}`;
    setChatMessages(prev => [
      ...prev,
      { id: userMsgId, role: 'user', text: queryToSubmit }
    ]);
    setQueryInput('');
    setIsTyping(true);

    const result = await analyzeInvestigationApi(workspaceId, queryToSubmit);
    setIsTyping(false);

    if (result.success) {
      const assistantMsgId = `assistant-${Date.now()}`;
      setChatMessages(prev => [
        ...prev,
        {
          id: assistantMsgId,
          role: 'assistant',
          text: result.answer,
          confidence: result.confidence,
          claims: result.claims,
          evidence: result.evidence,
          referencedFiles: result.referencedFiles,
          metadata: result.retrievedContextMetadata
        }
      ]);

      if (result.evidence && result.evidence.length > 0) {
        setActiveEvidenceList(result.evidence);
        setActiveEvidenceId(result.evidence[0].id);
      }
    } else {
      setChatMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          text: result.answer || 'An error occurred during investigation.',
          confidence: 'LOW',
          error: result.error || 'Failed to retrieve code investigation'
        }
      ]);
    }
  };

  const currentEvidence = activeEvidenceList.find(e => e.id === activeEvidenceId) || activeEvidenceList[0];
  const hasSubmittedQuestion = chatMessages.some(m => m.role === 'user');

  // Render text with clickable [ev-X] citation badges
  const renderFormattedAnswer = (text: string, evidenceList?: InvestigateEvidence[]) => {
    const parts = text.split(/(\[ev-\d+\])/g);
    return (
      <span className="leading-relaxed">
        {parts.map((part, idx) => {
          const match = part.match(/^\[(ev-\d+)\]$/);
          if (match) {
            const evId = match[1];
            const matchedEv = evidenceList?.find(e => e.id === evId);
            const isSelected = activeEvidenceId === evId;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (evidenceList) setActiveEvidenceList(evidenceList);
                  setActiveEvidenceId(evId);
                }}
                className={`inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded text-[11px] font-code-sm transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-primary text-on-primary border-primary font-semibold shadow-xs'
                    : 'bg-primary/15 hover:bg-primary/25 text-primary border-primary/30'
                }`}
                title={matchedEv ? `View snippet in ${matchedEv.filePath}` : evId}
              >
                <span className="material-symbols-outlined text-[12px]">description</span>
                <span>{evId}</span>
              </button>
            );
          }
          return part;
        })}
      </span>
    );
  };

  return (
    <div className="space-y-4 font-body-md">
      {/* Path Breadcrumb Header */}
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
        <div className="flex items-center gap-2 text-xs font-code-sm text-on-surface-variant">
          <span>/</span>
          <span>investigate</span>
          <span>/</span>
          <span className="text-primary font-semibold">
            {workspaceId ? workspaceId : 'no_workspace_selected'}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {workspaceId ? (
            <span className="px-3 py-1 bg-surface-container border border-outline-variant/30 rounded-lg text-xs font-code-sm text-primary flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span>Workspace: {workspaceId}</span>
            </span>
          ) : (
            <span className="px-3 py-1 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs font-code-sm text-rose-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Workspace Unavailable</span>
            </span>
          )}

          <button
            onClick={() => onSelectView('plan')}
            className="px-3.5 py-1.5 bg-primary hover:bg-primary-fixed text-on-primary rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <span>Create Refactor Plan</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* No Workspace Active Warning Banner */}
      {!workspaceId && (
        <div className="p-4 bg-surface-container border border-amber-500/30 rounded-xl space-y-2.5 shadow-md">
          <div className="flex items-center gap-2 text-amber-400 font-headline-sm text-sm font-semibold">
            <span className="material-symbols-outlined text-[20px]">warning</span>
            <span>Analysis Workspace Unavailable</span>
          </div>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            No active repository workspace found in memory. AI Codebase Investigation requires an analyzed workspace. Please analyze a repository first.
          </p>
          <div className="pt-1">
            <button
              onClick={() => onSelectView('init-workspace')}
              className="px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-semibold hover:bg-primary-fixed transition-colors flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Analyze Repository</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Split Layout: AI Assistant Panel (Left - 5 cols / ~42%) & Code Inspector (Right - 7 cols / ~58%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-160px)] min-h-[600px]">
        
        {/* AI Assistant Panel (Left Column) */}
        <div className="lg:col-span-5 bg-surface-container border border-outline-variant/30 rounded-2xl flex flex-col overflow-hidden shadow-lg h-full">
          
          {/* 1. HEADER */}
          <div className="h-12 px-4 bg-surface-container-low border-b border-outline-variant/20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
              <h3 className="font-headline-sm text-xs font-semibold text-on-surface">Aqua Lens Assistant</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-code-sm px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                AST Intelligence
              </span>
            </div>
          </div>

          {/* 2. CONVERSATION / EMPTY STATE BODY */}
          <div className="flex-1 p-4 space-y-4 overflow-y-auto min-h-0">
            {!hasSubmittedQuestion ? (
              /* Deliberate Empty State */
              <div className="h-full flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  {/* Context overview box */}
                  <div className="p-4 bg-surface-container-lowest/80 border border-outline-variant/25 rounded-xl space-y-3 shadow-xs">
                    <div className="flex items-center gap-2 text-primary">
                      <span className="material-symbols-outlined text-[20px]">psychology</span>
                      <h4 className="font-semibold text-xs text-on-surface font-headline-sm">Code Intelligence Workspace</h4>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Ask natural language questions to inspect your repository's architectural logic, request paths, and AST symbol references grounded in exact source code context.
                    </p>

                    <div className="pt-2 border-t border-outline-variant/15">
                      <div className="text-[11px] text-on-surface-variant/90 font-semibold mb-2">What you can ask about:</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2 text-on-surface-variant bg-surface-container-low/80 p-2 rounded-lg border border-outline-variant/15">
                          <span className="material-symbols-outlined text-primary text-[16px]">account_tree</span>
                          <span>Application flow</span>
                        </div>
                        <div className="flex items-center gap-2 text-on-surface-variant bg-surface-container-low/80 p-2 rounded-lg border border-outline-variant/15">
                          <span className="material-symbols-outlined text-primary text-[16px]">code</span>
                          <span>Symbols & logic</span>
                        </div>
                        <div className="flex items-center gap-2 text-on-surface-variant bg-surface-container-low/80 p-2 rounded-lg border border-outline-variant/15">
                          <span className="material-symbols-outlined text-primary text-[16px]">hub</span>
                          <span>Dependencies</span>
                        </div>
                        <div className="flex items-center gap-2 text-on-surface-variant bg-surface-container-low/80 p-2 rounded-lg border border-outline-variant/15">
                          <span className="material-symbols-outlined text-primary text-[16px]">alt_route</span>
                          <span>Routing & API</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Compact Example Question Chips */}
                  <div className="space-y-2">
                    <div className="text-[10px] text-on-surface-variant/70 font-code-sm uppercase tracking-wider font-semibold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px] text-primary">lightbulb</span>
                      <span>Suggested Queries:</span>
                    </div>
                    <div className="space-y-2">
                      {sampleQuestions.map((q, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendQuery(undefined, q)}
                          className="w-full p-3 text-left bg-surface-container-low hover:bg-surface-container border border-outline-variant/25 hover:border-primary/40 rounded-xl text-xs text-on-surface hover:text-primary transition-all flex items-center justify-between group shadow-2xs cursor-pointer"
                        >
                          <span className="font-code-sm font-medium">"{q}"</span>
                          <span className="material-symbols-outlined text-[16px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer hint */}
                <div className="text-[11px] text-on-surface-variant/60 text-center font-code-sm border-t border-outline-variant/15 pt-2">
                  All answers are validated against deterministic repository AST graphs.
                </div>
              </div>
            ) : (
              /* Populated Conversation Stream */
              chatMessages.map((msg) => (
                <div key={msg.id} className="space-y-3">
                  {msg.role === 'user' ? (
                    <div className="ml-auto max-w-[90%] p-3.5 bg-surface-container-high rounded-xl border border-primary/30 text-xs font-body-md text-on-surface shadow-xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-primary font-code-sm uppercase font-semibold">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">person</span>
                          User Query
                        </span>
                      </div>
                      <p className="font-medium">{msg.text}</p>
                    </div>
                  ) : (
                    <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/30 space-y-3 shadow-xs">
                      {/* Assistant Response Header */}
                      <div className="flex items-center justify-between border-b border-outline-variant/15 pb-2">
                        <span className="text-[11px] text-primary font-code-sm font-semibold uppercase flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                          Aqua Lens Assistant
                        </span>
                        {msg.confidence && (
                          <span
                            className={`text-[10px] font-code-sm px-2 py-0.5 rounded border font-semibold ${
                              msg.confidence === 'HIGH'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : msg.confidence === 'MEDIUM'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {msg.confidence} Confidence
                          </span>
                        )}
                      </div>

                      {/* Response Text with Inline Citation Badges */}
                      <div className="text-xs text-on-surface leading-relaxed whitespace-pre-line">
                        {renderFormattedAnswer(msg.text, msg.evidence)}
                      </div>

                      {/* Error display */}
                      {msg.error && (
                        <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300 font-code-sm">
                          {msg.error}
                        </div>
                      )}

                      {/* Grounded Claims Section */}
                      {msg.claims && msg.claims.length > 0 && (
                        <div className="space-y-2 pt-2.5 border-t border-outline-variant/15">
                          <div className="text-[10px] text-on-surface-variant/80 font-label-caps uppercase font-semibold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px] text-primary">verified</span>
                            <span>Grounded Claims:</span>
                          </div>
                          <ul className="space-y-1.5">
                            {msg.claims.map((claim, cIdx) => (
                              <li key={cIdx} className="text-xs text-on-surface-variant bg-surface-container/50 p-2.5 rounded-lg border border-outline-variant/20 space-y-1.5">
                                <div>• {claim.text}</div>
                                {claim.evidenceIds && claim.evidenceIds.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {claim.evidenceIds.map(evId => {
                                      const matchedEv = msg.evidence?.find(e => e.id === evId);
                                      const isSelected = activeEvidenceId === evId;
                                      return (
                                        <button
                                          key={evId}
                                          type="button"
                                          onClick={() => {
                                            if (msg.evidence) setActiveEvidenceList(msg.evidence);
                                            setActiveEvidenceId(evId);
                                          }}
                                          className={`px-2 py-0.5 rounded text-[10px] font-code-sm transition-all flex items-center gap-1 cursor-pointer border ${
                                            isSelected
                                              ? 'bg-primary text-on-primary border-primary font-semibold shadow-xs'
                                              : 'bg-primary/10 hover:bg-primary/20 text-primary border-primary/30'
                                          }`}
                                          title={matchedEv ? `Jump to ${matchedEv.filePath}` : evId}
                                        >
                                          <span className="material-symbols-outlined text-[12px]">description</span>
                                          <span>[{evId}] {matchedEv ? matchedEv.filePath : evId}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Connected Retrieved Evidence Toolbar */}
                      {msg.evidence && msg.evidence.length > 0 && (
                        <div className="space-y-2 pt-2.5 border-t border-outline-variant/15">
                          <div className="flex items-center justify-between text-[10px] text-on-surface-variant/80 font-label-caps uppercase font-semibold">
                            <span>Retrieved Evidence ({msg.evidence.length})</span>
                            {msg.metadata && (
                              <span className="font-code-sm text-outline-variant/70">
                                {msg.metadata.totalFilesRetrieved} files • {msg.metadata.totalLinesRetrieved} lines
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.evidence.map((ev) => (
                              <button
                                key={ev.id}
                                type="button"
                                onClick={() => {
                                  if (msg.evidence) setActiveEvidenceList(msg.evidence);
                                  setActiveEvidenceId(ev.id);
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-code-sm flex items-center gap-1.5 transition-all cursor-pointer border ${
                                  activeEvidenceId === ev.id
                                    ? 'bg-primary text-on-primary border-primary font-semibold shadow-xs'
                                    : 'bg-surface-container-high/60 hover:bg-surface-container-high text-primary border-primary/30 hover:border-primary/60'
                                }`}
                              >
                                <span className="material-symbols-outlined text-[13px]">description</span>
                                <span className="font-semibold">[{ev.id}]</span>
                                <span className="truncate max-w-[160px]">{ev.filePath}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}

            {isTyping && (
              <div className="p-3 bg-surface-container-lowest rounded-xl border border-primary/30 text-xs text-primary font-code-sm animate-pulse flex items-center gap-2 shadow-xs">
                <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                Analyzing codebase AST & retrieving source evidence...
              </div>
            )}
          </div>

          {/* 3. ANCHORED COMPOSER (Bottom) */}
          <form onSubmit={(e) => handleSendQuery(e)} className="p-3 bg-surface-container-low border-t border-outline-variant/20 shrink-0">
            <div className="relative flex items-center w-full">
              <input
                type="text"
                value={queryInput}
                disabled={!workspaceId || isTyping}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder={workspaceId ? "Ask a question about application flow, symbols, or routing..." : "Analyze a repository first..."}
                className="w-full h-[52px] bg-surface-container-lowest border border-outline-variant/30 rounded-xl pl-4 pr-24 text-xs font-code-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary/60 focus:ring-1 focus:ring-primary/20 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-inner"
              />
              <div className="absolute right-2 flex items-center gap-2">
                <span className="text-[10px] font-code-sm text-on-surface-variant/50 hidden sm:inline select-none">
                  ↵ Enter
                </span>
                <button
                  type="submit"
                  disabled={!workspaceId || isTyping || !queryInput.trim()}
                  className="w-9 h-9 flex items-center justify-center bg-primary text-on-primary rounded-lg hover:bg-primary-fixed transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0 shadow-xs cursor-pointer"
                  title="Send Query"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Code Inspector (Right Column - 7 cols / ~58%) */}
        <div className="lg:col-span-7 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-lg flex flex-col h-full">
          
          {/* Header & File Tabs */}
          <div className="h-12 bg-surface-container-low px-4 flex items-center justify-between border-b border-outline-variant/20 shrink-0">
            <div className="flex items-center gap-2 shrink-0">
              <span className="material-symbols-outlined text-primary text-[18px]">terminal</span>
              <h3 className="font-headline-sm text-xs font-semibold text-on-surface">Code Inspector</h3>
            </div>

            {/* File Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-[70%] no-scrollbar">
              {activeEvidenceList.length > 0 ? (
                activeEvidenceList.map((ev) => {
                  const isActive = currentEvidence?.id === ev.id;
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => setActiveEvidenceId(ev.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-code-sm flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer border ${
                        isActive
                          ? 'bg-surface-container text-primary font-semibold border-primary/40 shadow-xs'
                          : 'text-on-surface-variant hover:text-on-surface border-transparent hover:bg-surface-container-low'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">description</span>
                      <span className="font-semibold text-[11px]">[{ev.id}]</span>
                      <span className="truncate max-w-[140px]">{ev.filePath.split('/').pop()}</span>
                    </button>
                  );
                })
              ) : (
                <div className="text-xs text-on-surface-variant/60 font-code-sm flex items-center gap-1.5">
                  <span>No evidence selected</span>
                </div>
              )}
            </div>
          </div>

          {/* Active File Metadata Header & Source View */}
          {currentEvidence ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-4 py-2.5 bg-surface-container-low/70 border-b border-outline-variant/20 flex flex-wrap items-center justify-between gap-2 text-xs font-code-sm shrink-0">
                <div className="flex items-center gap-2 text-on-surface min-w-0">
                  <span className="text-primary font-semibold truncate">{currentEvidence.filePath}</span>
                  {currentEvidence.lineRanges && currentEvidence.lineRanges.length > 0 && (
                    <span className="text-on-surface-variant/80 text-[11px] shrink-0 bg-surface-container/60 px-2 py-0.5 rounded border border-outline-variant/20">
                      Lines {currentEvidence.lineRanges[0].start}–{currentEvidence.lineRanges[0].end}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-on-surface-variant/80 bg-surface-container/60 px-2 py-0.5 rounded border border-outline-variant/20">
                    Score: <strong className="text-primary">{currentEvidence.relevanceScore}</strong>
                  </span>
                  {currentEvidence.matchedSymbols && currentEvidence.matchedSymbols.length > 0 && (
                    <span className="text-primary/90 bg-primary/10 px-2 py-0.5 rounded border border-primary/20 truncate max-w-[200px]" title={currentEvidence.matchedSymbols.join(', ')}>
                      AST: [{currentEvidence.matchedSymbols.join(', ')}]
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(currentEvidence.snippet)}
                    className="p-1 hover:bg-surface-variant rounded text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                    title="Copy Code Snippet"
                  >
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  </button>
                </div>
              </div>

              {/* Code Snippet */}
              <div className="p-4 flex-1 font-code-sm text-xs bg-surface-container-lowest overflow-auto space-y-1">
                {currentEvidence.snippet.split('\n').map((line, idx) => {
                  const startLine = currentEvidence.lineRanges && currentEvidence.lineRanges.length > 0
                    ? currentEvidence.lineRanges[0].start
                    : 1;
                  const lineNum = startLine + idx;
                  return (
                    <div
                      key={idx}
                      className="flex items-start gap-4 px-2.5 py-0.5 rounded hover:bg-surface-container/40 transition-colors bg-primary/5 border-l-2 border-primary/60 font-code-sm"
                    >
                      <span className="w-9 text-right text-outline-variant/60 select-none text-[11px] font-mono shrink-0">{lineNum}</span>
                      <span className="leading-relaxed text-on-surface font-mono overflow-x-auto whitespace-pre">
                        {line}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-12 flex-1 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-surface-container-low flex items-center justify-center border border-outline-variant/20 shadow-xs">
                <span className="material-symbols-outlined text-primary/60 text-[32px]">code</span>
              </div>
              <div className="space-y-1 max-w-sm">
                <h4 className="text-sm font-semibold text-on-surface font-headline-sm">No Active Code Snippet</h4>
                <p className="text-xs text-on-surface-variant/70 leading-relaxed">
                  Ask a question in the AI Assistant panel to retrieve grounded source evidence, line numbers, and symbol references.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

