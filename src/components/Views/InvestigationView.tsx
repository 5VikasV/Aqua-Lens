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
        text: `Workspace \`${workspaceId}\` indexed. Ask any query about code logic, routing, or symbol definitions.`,
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

  return (
    <div className="space-y-5 font-body-md">
      {/* Path Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-outline-variant/20">
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
            className="px-3.5 py-1.5 bg-primary hover:bg-primary-fixed text-on-primary rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs"
          >
            <span>Create Refactor Plan</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* No Workspace Active Warning Banner */}
      {!workspaceId && (
        <div className="p-5 bg-surface-container border border-amber-500/30 rounded-2xl space-y-3 shadow-md">
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
              className="px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-semibold hover:bg-primary-fixed transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Analyze Repository</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: AI Terminal (Left) & Code Inspector (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-170px)] min-h-[580px]">
        {/* AI Terminal Chat Interface (Left Column) */}
        <div className="lg:col-span-5 bg-surface-container border border-outline-variant/30 rounded-2xl flex flex-col overflow-hidden shadow-lg">
          {/* Terminal Header */}
          <div className="h-12 px-4 bg-surface-container-low border-b border-outline-variant/20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined text-[18px]">terminal</span>
              <h3 className="font-headline-sm text-xs font-semibold text-on-surface">AI Code Intelligence Terminal</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-code-sm px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-semibold">
                AST Retrieval
              </span>
            </div>
          </div>

          {/* Conversation & Results Body */}
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {chatMessages.map((msg) => (
              <div key={msg.id} className="space-y-2.5">
                {msg.role === 'user' ? (
                  <div className="p-3 bg-surface-container-high rounded-xl border border-outline-variant/30 text-xs font-body-md text-on-surface ml-4">
                    <div className="text-[10px] text-primary font-code-sm uppercase mb-1 font-semibold">User Query</div>
                    {msg.text}
                  </div>
                ) : (
                  <div className="p-3.5 bg-surface-container-lowest rounded-xl border border-outline-variant/30 space-y-2.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-primary font-code-sm font-semibold uppercase flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
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

                    <p className="text-xs text-on-surface leading-relaxed whitespace-pre-line">
                      {msg.text}
                    </p>

                    {/* Error display */}
                    {msg.error && (
                      <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300 font-code-sm">
                        {msg.error}
                      </div>
                    )}

                    {/* Grounded Claims Section */}
                    {msg.claims && msg.claims.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-outline-variant/15">
                        <div className="text-[10px] text-on-surface-variant/70 font-label-caps uppercase font-semibold">Grounded Claims:</div>
                        <ul className="space-y-1.5">
                          {msg.claims.map((claim, cIdx) => (
                            <li key={cIdx} className="text-xs text-on-surface-variant bg-surface-container/40 p-2 rounded-lg border border-outline-variant/20 space-y-1">
                              <div>• {claim.text}</div>
                              {claim.evidenceIds && claim.evidenceIds.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-1">
                                  {claim.evidenceIds.map(evId => {
                                    const matchedEv = msg.evidence?.find(e => e.id === evId);
                                    return (
                                      <button
                                        key={evId}
                                        onClick={() => {
                                          if (msg.evidence) setActiveEvidenceList(msg.evidence);
                                          setActiveEvidenceId(evId);
                                        }}
                                        className="px-2 py-0.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded text-[10px] font-code-sm transition-colors flex items-center gap-1"
                                      >
                                        <span className="material-symbols-outlined text-[12px]">description</span>
                                        <span>{matchedEv ? matchedEv.filePath : evId}</span>
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

                    {/* Referenced Evidence Cards */}
                    {msg.evidence && msg.evidence.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-outline-variant/15">
                        <div className="text-[10px] text-on-surface-variant/70 font-label-caps uppercase font-semibold">Retrieved Evidence:</div>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.evidence.map((ev) => (
                            <button
                              key={ev.id}
                              onClick={() => {
                                if (msg.evidence) setActiveEvidenceList(msg.evidence);
                                setActiveEvidenceId(ev.id);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-code-sm flex items-center gap-1 transition-colors border ${
                                activeEvidenceId === ev.id
                                  ? 'bg-primary text-on-primary border-primary font-semibold'
                                  : 'bg-surface-container hover:bg-surface-variant text-primary border-primary/30'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[13px]">description</span>
                              <span>{ev.filePath}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/30 text-xs text-primary font-code-sm animate-pulse flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                Analyzing codebase AST & retrieved evidence...
              </div>
            )}

            {/* Quick Sample Questions (Only when 1 welcome message present) */}
            {workspaceId && chatMessages.length <= 1 && (
              <div className="pt-2 space-y-2">
                <div className="text-[10px] text-on-surface-variant/60 font-code-sm uppercase tracking-wider font-semibold">Suggested Queries:</div>
                <div className="space-y-1.5">
                  {sampleQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendQuery(undefined, q)}
                      className="w-full p-2.5 text-left bg-surface-container-low hover:bg-surface-container border border-outline-variant/20 hover:border-primary/40 rounded-xl text-xs text-on-surface-variant hover:text-primary transition-all flex items-center justify-between group"
                    >
                      <span>"{q}"</span>
                      <span className="material-symbols-outlined text-[14px] opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Integrated Anchored Composer (Bottom) */}
          <form onSubmit={(e) => handleSendQuery(e)} className="p-3 bg-surface-container-low border-t border-outline-variant/20 shrink-0">
            <div className="relative flex items-center">
              <input
                type="text"
                value={queryInput}
                disabled={!workspaceId || isTyping}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder={workspaceId ? "Ask a question about application flow or symbols..." : "Analyze a repository first..."}
                className="w-full h-[52px] bg-surface-container-lowest border border-outline-variant/30 rounded-xl pl-4 pr-24 text-xs font-code-md text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary/60 focus:ring-1 focus:ring-primary/20 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              />
              <div className="absolute right-2 flex items-center gap-2">
                <span className="text-[10px] font-code-sm text-on-surface-variant/50 hidden sm:inline select-none">
                  Press Enter ↵
                </span>
                <button
                  type="submit"
                  disabled={!workspaceId || isTyping || !queryInput.trim()}
                  className="w-9 h-9 flex items-center justify-center bg-primary text-on-primary rounded-lg hover:bg-primary-fixed transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  title="Send Query"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Code Inspector (Right Column) */}
        <div className="lg:col-span-7 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-lg flex flex-col">
          {/* File Tabs Header */}
          <div className="h-12 bg-surface-container-low px-4 flex items-center justify-between border-b border-outline-variant/20 shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-[80%] pr-2">
              {activeEvidenceList.length > 0 ? (
                activeEvidenceList.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => setActiveEvidenceId(ev.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-code-sm flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                      (currentEvidence?.id === ev.id)
                        ? 'bg-surface-container text-primary font-semibold border border-primary/30 shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">description</span>
                    <span>{ev.filePath}</span>
                  </button>
                ))
              ) : (
                <div className="text-xs text-on-surface-variant/60 font-code-sm flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">code</span>
                  <span>Code Inspector</span>
                </div>
              )}
            </div>

            {currentEvidence && (
              <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                <button
                  onClick={() => navigator.clipboard.writeText(currentEvidence.snippet)}
                  className="p-1.5 hover:bg-surface-variant rounded-lg text-on-surface-variant hover:text-primary transition-colors"
                  title="Copy snippet"
                >
                  <span className="material-symbols-outlined text-[18px]">content_copy</span>
                </button>
              </div>
            )}
          </div>

          {/* Syntax Highlighted Code Viewer */}
          {currentEvidence ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Evidence File Info Bar */}
              <div className="px-4 py-2 bg-surface-container/40 border-b border-outline-variant/15 flex flex-wrap items-center justify-between gap-2 text-xs font-code-sm shrink-0">
                <div className="flex items-center gap-2 text-on-surface">
                  <span className="text-primary font-semibold">{currentEvidence.filePath}</span>
                  {currentEvidence.lineRanges && currentEvidence.lineRanges.length > 0 && (
                    <span className="text-on-surface-variant/70 text-[11px]">
                      (Lines {currentEvidence.lineRanges[0].start}-{currentEvidence.lineRanges[0].end})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-on-surface-variant">
                  <span>Score: {currentEvidence.relevanceScore}</span>
                  {currentEvidence.matchedSymbols && currentEvidence.matchedSymbols.length > 0 && (
                    <span className="text-primary/80">
                      Symbols: [{currentEvidence.matchedSymbols.join(', ')}]
                    </span>
                  )}
                </div>
              </div>

              {/* Code Snippet Output */}
              <div className="p-4 flex-1 font-code-sm text-xs bg-surface-container-lowest overflow-auto space-y-1">
                {currentEvidence.snippet.split('\n').map((line, idx) => {
                  const startLine = currentEvidence.lineRanges && currentEvidence.lineRanges.length > 0
                    ? currentEvidence.lineRanges[0].start
                    : 1;
                  const lineNum = startLine + idx;
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-4 px-2 py-0.5 rounded transition-colors hover:bg-surface-container/30 bg-primary/5 border-l-2 border-primary/50"
                    >
                      <span className="w-10 text-right text-outline opacity-50 select-none">{lineNum}</span>
                      <span className="leading-relaxed text-on-surface">
                        {line}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-12 flex-1 flex flex-col items-center justify-center text-center space-y-3">
              <span className="material-symbols-outlined text-outline-variant/50 text-[48px]">code</span>
              <p className="text-xs text-on-surface-variant/70 max-w-sm leading-relaxed">
                Ask a question in the AI Terminal to inspect actual repository source snippets, line numbers, and AST symbol references.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
