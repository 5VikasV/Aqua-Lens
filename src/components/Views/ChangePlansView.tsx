import React, { useState, useEffect } from 'react';
import { ViewMode, AnalyzeResponse, ChangePlanResponse } from '../../types';
import { generateChangePlanApi } from '../../services/api';

interface ChangePlansViewProps {
  workspaceId?: string;
  analysisData?: AnalyzeResponse | null;
  onSelectView: (view: ViewMode) => void;
}

export const ChangePlansView: React.FC<ChangePlansViewProps> = ({
  workspaceId: propWorkspaceId,
  analysisData,
  onSelectView
}) => {
  const effectiveWorkspaceId = propWorkspaceId || analysisData?.workspaceId || (
    analysisData?.repository?.owner && analysisData?.repository?.name
      ? `${analysisData.repository.owner}/${analysisData.repository.name}`
      : undefined
  );

  const [changeQuery, setChangeQuery] = useState<string>(
    'Add CORS middleware configuration options to the main application'
  );
  const [plan, setPlan] = useState<ChangePlanResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedStep, setExpandedStep] = useState<number>(1);
  const [prCreatedModal, setPrCreatedModal] = useState<boolean>(false);

  const handleFetchPlan = async (queryToUse?: string) => {
    const activeQuery = queryToUse || changeQuery;
    if (!effectiveWorkspaceId) {
      setError('No active repository workspace found. Please analyze a repository first.');
      return;
    }
    if (!activeQuery.trim()) {
      setError('Please enter a valid change request.');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await generateChangePlanApi(effectiveWorkspaceId, activeQuery.trim());

    setLoading(false);
    if (res.success) {
      setPlan(res);
      if (res.steps && res.steps.length > 0) {
        setExpandedStep(res.steps[0].stepNumber);
      }
    } else {
      setError(res.error || res.summary || 'Failed to generate change plan.');
    }
  };

  useEffect(() => {
    if (effectiveWorkspaceId && !plan && !loading && !error) {
      handleFetchPlan();
    }
  }, [effectiveWorkspaceId]);

  const handleApplyPR = () => {
    setPrCreatedModal(true);
  };

  const getRiskBadgeStyle = (risk: string) => {
    switch (risk) {
      case 'HIGH':
      case 'CRITICAL':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'MEDIUM':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      default:
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    }
  };

  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case 'Modify':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'Create':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'Migration':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      default:
        return 'bg-primary/15 text-primary border-primary/30';
    }
  };

  // 1. Empty Workspace State
  if (!effectiveWorkspaceId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-xl mx-auto space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-surface-container border border-outline-variant/30 text-primary flex items-center justify-center shadow-lg">
          <span className="material-symbols-outlined text-[36px]">checklist_rtl</span>
        </div>
        <div className="space-y-2">
          <h2 className="font-headline-md text-xl text-on-surface">No Active Workspace</h2>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Analyze a repository first to generate dynamic execution change plans based on AST dependency analysis and AI refactoring guidance.
          </p>
        </div>
        <button
          onClick={() => onSelectView('init-workspace')}
          className="px-5 py-2.5 bg-primary text-on-primary font-semibold rounded-xl text-xs hover:bg-primary-fixed transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Analyze a Repository
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-body-md">
      
      {/* PR Created Modal Dialog */}
      {prCreatedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
          <div className="bg-surface-container border border-outline-variant/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">check_circle</span>
            </div>
            <h3 className="font-headline-md text-xl text-on-surface">Refactor Plan Attached to PR</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Pull Request proposal <code className="text-primary font-code-sm">{plan?.planId || 'PLAN-1001'} ({plan?.title})</code> has been generated with {plan?.steps.length || 0} ordered steps and diff previews.
            </p>
            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setPrCreatedModal(false)}
                className="px-4 py-2 bg-primary text-on-primary font-semibold text-xs rounded-xl hover:bg-primary-fixed transition-colors cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Path Breadcrumb & Status Header */}
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
        <div className="flex items-center gap-2 text-xs font-code-sm text-on-surface-variant">
          <span>/</span>
          <span>plan</span>
          <span>/</span>
          <span className="text-primary font-semibold">
            {effectiveWorkspaceId}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-on-surface-variant font-code-sm">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>AST Generator Active</span>
        </div>
      </div>

      {/* 2. CHANGE REQUEST COMPOSER */}
      <div className="p-4 bg-surface-container border border-outline-variant/30 rounded-2xl shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-on-surface-variant font-code-sm font-semibold uppercase">
            <span className="material-symbols-outlined text-primary text-[18px]">auto_fix</span>
            <span>Change Request Flow</span>
          </div>
          <span className="text-[11px] font-code-sm text-outline-variant/70">
            Change Request → Generate Plan → Execution Guide
          </span>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="flex-1 relative flex items-center">
            <input
              type="text"
              value={changeQuery}
              disabled={loading}
              onChange={(e) => setChangeQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFetchPlan()}
              placeholder="Describe proposed change (e.g. Add CORS middleware configuration options...)"
              className="w-full h-[52px] bg-surface-container-lowest border border-outline-variant/30 rounded-xl pl-4 pr-16 text-xs font-code-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary/60 focus:ring-1 focus:ring-primary/20 focus:outline-none disabled:opacity-50 transition-all shadow-inner"
            />
            <span className="absolute right-3 text-[10px] font-code-sm text-on-surface-variant/50 hidden sm:inline select-none">
              ↵ Enter
            </span>
          </div>

          <button
            onClick={() => handleFetchPlan()}
            disabled={loading || !changeQuery.trim()}
            className="h-[52px] px-6 bg-primary text-on-primary hover:bg-primary-fixed disabled:opacity-40 disabled:cursor-not-allowed font-semibold rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin"></span>
                <span>Generating Plan...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">bolt</span>
                <span>Generate Plan</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 6. LOADING SKELETON */}
      {loading && (
        <div className="p-8 bg-surface-container border border-outline-variant/30 rounded-2xl text-center space-y-4 shadow-lg animate-pulse">
          <div className="w-12 h-12 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
          <div className="space-y-1">
            <h3 className="font-headline-sm text-sm font-semibold text-on-surface">Analyzing Codebase AST & Calculating Impact...</h3>
            <p className="text-xs text-on-surface-variant">Building deterministic execution steps for <code className="text-primary font-code-sm">{effectiveWorkspaceId}</code></p>
          </div>
          <div className="flex justify-center gap-2 pt-2">
            <span className="w-2 h-2 rounded-full bg-primary/40 animate-ping" />
            <span className="w-2 h-2 rounded-full bg-primary/60 animate-ping delay-100" />
            <span className="w-2 h-2 rounded-full bg-primary animate-ping delay-200" />
          </div>
        </div>
      )}

      {/* 6. ERROR BANNER */}
      {!loading && error && (
        <div className="p-5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-rose-400 text-[24px]">error</span>
            <div>
              <h4 className="font-headline-sm text-sm text-on-surface font-semibold">Plan Generation Error</h4>
              <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">{error}</p>
            </div>
          </div>
          <button
            onClick={() => handleFetchPlan()}
            className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-semibold text-xs rounded-xl transition-colors shrink-0 cursor-pointer"
          >
            Retry Generation
          </button>
        </div>
      )}

      {/* 6. NO MATCHING TARGET STATE */}
      {!loading && !error && plan && plan.steps.length === 0 && (
        <div className="p-8 bg-surface-container border border-outline-variant/30 rounded-2xl text-center space-y-3">
          <span className="material-symbols-outlined text-outline-variant/60 text-[40px]">search_off</span>
          <h4 className="font-headline-sm text-sm font-semibold text-on-surface">No Suitable Implementation Targets Found</h4>
          <p className="text-xs text-on-surface-variant max-w-md mx-auto leading-relaxed">
            The change request did not match any implementation source files in the current AST index. Try adjusting your query terms.
          </p>
        </div>
      )}

      {/* PLAN RESULT RENDER */}
      {!loading && !error && plan && plan.steps.length > 0 && (
        <>
          {/* 1. PLAN HEADER */}
          <div className="p-6 bg-surface-container border border-outline-variant/30 rounded-2xl space-y-4 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-outline-variant/20">
              <div className="space-y-1.5 min-w-0 flex-1">
                {/* Eyebrow & Risk Badge */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[11px] font-code-sm text-primary font-semibold uppercase tracking-wider bg-primary/10 px-2.5 py-0.5 rounded border border-primary/20">
                    EXECUTION PLAN · {plan.planId}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded text-[11px] font-code-sm font-semibold border ${getRiskBadgeStyle(plan.riskLevel)}`}>
                    Risk: {plan.riskLevel}
                  </span>
                </div>

                {/* Plan Title */}
                <h1 className="font-display-lg text-xl sm:text-2xl text-on-surface font-bold truncate">
                  {plan.title}
                </h1>

                {/* Short Summary */}
                {plan.summary && (
                  <p className="text-xs text-on-surface-variant leading-relaxed max-w-4xl pt-1">
                    {plan.summary}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
                <button
                  onClick={handleApplyPR}
                  className="px-3.5 py-2 bg-surface-container-high hover:bg-surface-variant border border-outline-variant/30 rounded-xl text-xs font-semibold text-on-surface transition-colors flex items-center gap-2 shadow-2xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">difference</span>
                  <span>Add to PR</span>
                </button>
                <button
                  onClick={() => {
                    const text = plan.steps.map(s => `Step ${s.stepNumber}: [${s.type}] ${s.filePath}\n${s.description}`).join('\n\n');
                    navigator.clipboard.writeText(text);
                    alert('Implementation Guide copied to clipboard!');
                  }}
                  className="px-4 py-2 bg-primary text-on-primary hover:bg-primary-fixed font-semibold rounded-xl text-xs transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  <span>Export Guide</span>
                </button>
              </div>
            </div>
          </div>

          {/* MAIN GRID: Execution Sequence (Left) & Impact Scope / Review (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* 3. EXECUTION SEQUENCE (Left Column - 7 cols / ~58%) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-headline-sm text-xs font-semibold text-on-surface uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">format_list_numbered</span>
                  <span>Execution Sequence</span>
                </h3>
                <span className="text-xs font-code-sm text-on-surface-variant">
                  {plan.steps.length} Ordered Steps
                </span>
              </div>

              <div className="space-y-3">
                {plan.steps.map((step) => {
                  const isExpanded = expandedStep === step.stepNumber;
                  return (
                    <div
                      key={step.stepNumber}
                      className={`bg-surface-container border rounded-xl overflow-hidden transition-all shadow-sm ${
                        step.isWarning ? 'border-amber-500/40' : 'border-outline-variant/30'
                      }`}
                    >
                      {/* Step Header */}
                      <div
                        onClick={() => setExpandedStep(isExpanded ? 0 : step.stepNumber)}
                        className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-surface-container-high/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-7 h-7 rounded-lg bg-surface-container-lowest text-primary border border-outline-variant/30 font-code-sm font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                            #{step.stepNumber}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-label-caps border font-semibold ${getTypeBadgeStyle(step.type)}`}>
                                {step.type}
                              </span>
                              <span className="font-code-sm text-xs font-semibold text-primary truncate">
                                {step.filePath}
                              </span>
                              {step.prerequisiteSteps && step.prerequisiteSteps.length > 0 && (
                                <span className="text-[10px] font-code-sm px-1.5 py-0.5 rounded bg-primary/10 text-primary/80 border border-primary/20">
                                  Requires Step #{step.prerequisiteSteps.join(', #')}
                                </span>
                              )}
                            </div>
                            {step.description && (
                              <div className="text-xs text-on-surface-variant mt-1 line-clamp-2">
                                {step.description}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {step.badgeText && (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-code-sm ${
                              step.isWarning ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/20'
                            }`}>
                              {step.badgeText}
                            </span>
                          )}
                          <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                            {isExpanded ? 'expand_less' : 'expand_more'}
                          </span>
                        </div>
                      </div>

                      {/* Expanded Diff Preview */}
                      {isExpanded && (
                        <div className="border-t border-outline-variant/20 bg-surface-container-lowest p-3 font-code-sm text-xs space-y-2 overflow-x-auto">
                          {step.diffHeader && (
                            <div className="text-outline-variant/70 text-[11px] font-code-sm select-none pb-1 border-b border-outline-variant/15">
                              {step.diffHeader}
                            </div>
                          )}

                          {step.diffLines && step.diffLines.length > 0 ? (
                            <div className="space-y-0.5 font-mono text-[11.5px]">
                              {step.diffLines.map((line, i) => (
                                <div
                                  key={i}
                                  className={`flex items-start gap-3 px-2 py-0.5 rounded transition-colors ${
                                    line.type === 'add'
                                      ? 'bg-emerald-500/10 border-l-2 border-emerald-500 text-emerald-300 font-medium'
                                      : line.type === 'remove'
                                      ? 'bg-rose-500/10 border-l-2 border-rose-500 text-rose-300'
                                      : 'text-on-surface-variant/70'
                                  }`}
                                >
                                  <span className="w-7 text-right opacity-40 select-none text-[10px] shrink-0 font-mono">
                                    {line.numAfter || line.numBefore || i + 1}
                                  </span>
                                  <span className="w-3 select-none text-center font-bold shrink-0">
                                    {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                                  </span>
                                  <span className="leading-relaxed whitespace-pre overflow-x-auto">{line.content}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-on-surface-variant/60 italic p-1">
                              No inline diff preview provided for this step.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT SIDE PANEL: Impact Scope (4) & Review & Verification (5) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* 4. IMPACT SCOPE */}
              <div className="p-5 bg-surface-container border border-outline-variant/30 rounded-2xl space-y-3.5 shadow-lg">
                <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                  <h3 className="font-headline-sm text-xs font-semibold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">hub</span>
                    <span>Impact Scope</span>
                  </h3>
                  <span className="text-xs font-code-sm text-primary font-semibold">
                    {plan.targetFiles.length} Target{plan.targetFiles.length === 1 ? '' : 's'} · {plan.affectedFiles.length} Affected
                  </span>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {/* Primary Targets */}
                  {plan.targetFiles.map((tf, i) => (
                    <div key={`target-${i}`} className="flex items-center justify-between text-xs p-2.5 bg-primary/10 border border-primary/30 rounded-xl shadow-2xs">
                      <span className="text-primary font-code-sm font-semibold truncate">{tf}</span>
                      <span className="px-2 py-0.5 bg-primary text-on-primary rounded text-[10px] uppercase font-label-caps font-bold shrink-0">
                        TARGET
                      </span>
                    </div>
                  ))}

                  {/* Affected Files */}
                  {plan.affectedFiles.map((af, i) => (
                    <div key={`affected-${i}`} className="flex items-center justify-between text-xs p-2.5 bg-surface-container-lowest border border-outline-variant/20 rounded-xl">
                      <span className="text-on-surface-variant font-code-sm truncate">{af}</span>
                      <span className="px-2 py-0.5 bg-surface-container-high text-on-surface-variant rounded text-[10px] uppercase font-label-caps font-semibold shrink-0">
                        AFFECTED
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. REVIEW & VERIFICATION */}
              <div className="p-5 bg-surface-container border border-outline-variant/30 rounded-2xl space-y-4 shadow-lg">
                <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                  <h3 className="font-headline-sm text-xs font-semibold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
                    <span>Review & Verification</span>
                  </h3>
                </div>
                
                <div className="space-y-2.5">
                  {/* AST Symbols Verified */}
                  <div className="flex items-center justify-between text-xs p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/20">
                    <span className="text-on-surface font-medium flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary text-[16px]">code_blocks</span>
                      AST Symbol Validation
                    </span>
                    <span className="text-emerald-400 font-code-sm font-semibold">
                      {plan.validation.validatedSymbolsCount} Symbols Verified
                    </span>
                  </div>

                  {/* File Integrity */}
                  <div className="flex items-center justify-between text-xs p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/20">
                    <span className="text-on-surface font-medium flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary text-[16px]">folder_managed</span>
                      File Integrity
                    </span>
                    {plan.validation.allFilesExist ? (
                      <span className="text-emerald-400 flex items-center gap-1 font-semibold text-xs">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        All Files Valid
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1 font-semibold text-xs">
                        <span className="material-symbols-outlined text-[16px]">warning</span>
                        {plan.validation.invalidFiles.length} Missing Files
                      </span>
                    )}
                  </div>
                </div>

                {/* Recommended Verifications */}
                {plan.verificationSteps && plan.verificationSteps.length > 0 && (
                  <div className="pt-1 space-y-2">
                    <div className="text-xs font-semibold text-on-surface flex items-center gap-1">
                      <span className="material-symbols-outlined text-primary text-[16px]">terminal</span>
                      <span>Recommended Verification Commands:</span>
                    </div>
                    <div className="space-y-1.5">
                      {plan.verificationSteps.map((vs, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2 text-xs text-on-surface bg-surface-container-lowest border border-outline-variant/20 p-2.5 rounded-xl font-code-sm">
                          <code className="text-primary truncate">{vs}</code>
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(vs)}
                            className="p-1 hover:bg-surface-variant rounded text-on-surface-variant hover:text-primary transition-colors shrink-0 cursor-pointer"
                            title="Copy command"
                          >
                            <span className="material-symbols-outlined text-[14px]">content_copy</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Plan Warnings */}
                {plan.warnings && plan.warnings.length > 0 && (
                  <div className="pt-1 space-y-2">
                    <div className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">warning</span>
                      <span>Plan Warnings ({plan.warnings.length}):</span>
                    </div>
                    <div className="space-y-1.5">
                      {plan.warnings.map((w, idx) => (
                        <div key={idx} className="text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/25 p-2.5 rounded-xl leading-relaxed font-body-sm">
                          {w}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    onClick={() => onSelectView('overview')}
                    className="w-full py-2.5 bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <span>Return to Overview</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        </>
      )}

    </div>
  );
};
