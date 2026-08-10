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
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'MEDIUM':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    }
  };

  // 1. Empty Workspace State
  if (!effectiveWorkspaceId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-xl mx-auto space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-lg">
          <span className="material-symbols-outlined text-[36px]">checklist_rtl</span>
        </div>
        <div className="space-y-2">
          <h2 className="font-display-lg text-2xl text-on-surface">No Workspace Available</h2>
          <p className="text-body-sm text-on-surface-variant leading-relaxed">
            Analyze a repository first to generate dynamic Change Plans based on AST dependency analysis and AI refactoring guidance.
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

  return (
    <div className="space-y-8 font-body-md">
      
      {/* PR Created Modal Dialog */}
      {prCreatedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
          <div className="bg-surface-container border border-outline-variant/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">check_circle</span>
            </div>
            <h3 className="font-headline-md text-xl text-on-surface">Refactor Plan Attached to PR</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Pull Request proposal <code className="text-primary font-code-sm">#{plan?.planId || 'PLAN-1001'} ({plan?.title})</code> has been generated with {plan?.steps.length || 0} ordered steps and diff previews.
            </p>
            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setPrCreatedModal(false)}
                className="px-4 py-2 bg-primary-container text-on-primary-container font-semibold text-xs rounded-xl hover:bg-primary-fixed transition-colors"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Request Query Input Bar */}
      <div className="p-4 bg-surface-container border border-outline-variant/40 rounded-2xl shadow-xl flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="flex-1 flex items-center gap-3 bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-2.5">
          <span className="material-symbols-outlined text-primary text-[22px]">auto_fix</span>
          <input
            type="text"
            value={changeQuery}
            onChange={(e) => setChangeQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFetchPlan()}
            placeholder="Describe proposed changes (e.g., Add CORS middleware configuration options...)"
            className="w-full bg-transparent text-body-sm text-on-surface focus:outline-none placeholder:text-outline"
          />
        </div>
        <button
          onClick={() => handleFetchPlan()}
          disabled={loading}
          className="px-6 py-2.5 bg-primary-container hover:bg-primary-fixed disabled:opacity-50 text-on-primary-container font-semibold rounded-xl text-body-sm transition-all shadow-md flex items-center justify-center gap-2 shrink-0"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-on-primary-container/30 border-t-on-primary-container rounded-full animate-spin"></span>
              Generating...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">bolt</span>
              Generate Plan
            </>
          )}
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="p-12 bg-surface-container border border-outline-variant/40 rounded-3xl text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
          <h3 className="font-headline-sm text-lg text-on-surface">Analyzing Codebase & AST Impact...</h3>
          <p className="text-xs text-on-surface-variant">Generating step-by-step implementation guide for workspace <code className="text-primary font-code-sm">{effectiveWorkspaceId}</code>.</p>
        </div>
      )}

      {/* Error Banner */}
      {!loading && error && (
        <div className="p-6 bg-error-container/20 border border-error/30 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-error text-[24px]">warning</span>
            <div>
              <h4 className="font-headline-sm text-sm text-on-surface font-semibold">Change Plan Generation Failed</h4>
              <p className="text-xs text-on-surface-variant mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={() => handleFetchPlan()}
            className="px-4 py-2 bg-error-container text-on-error-container hover:bg-error/30 font-semibold text-xs rounded-xl transition-colors shrink-0"
          >
            Retry Generation
          </button>
        </div>
      )}

      {/* Plan Render */}
      {!loading && plan && (
        <>
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant/30">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-primary text-[22px]">checklist_rtl</span>
                <span className="text-xs font-code-sm text-primary font-semibold uppercase">EXECUTION PLAN {plan.planId}</span>
              </div>
              <h1 className="font-display-lg text-2xl sm:text-3xl text-on-surface flex items-center gap-3">
                <span>{plan.title}</span>
                <span className={`px-3 py-0.5 border rounded-full text-xs font-code-sm ${getRiskBadgeStyle(plan.riskLevel)}`}>
                  Risk: {plan.riskLevel}
                </span>
              </h1>
              {plan.summary && (
                <p className="text-xs text-on-surface-variant mt-2 max-w-3xl leading-relaxed">
                  {plan.summary}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleApplyPR}
                className="px-4 py-2 bg-surface-container hover:bg-surface-variant border border-outline-variant/40 rounded-xl text-body-sm text-on-surface transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">difference</span>
                Add to PR
              </button>
              <button
                onClick={() => {
                  const text = plan.steps.map(s => `${s.stepNumber}. ${s.type} ${s.filePath}\n${s.description}`).join('\n\n');
                  navigator.clipboard.writeText(text);
                  alert('Implementation Guide copied to clipboard!');
                }}
                className="px-5 py-2 bg-primary-container hover:bg-primary-fixed text-on-primary-container font-semibold rounded-xl text-body-sm transition-all shadow-md flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Export Implementation Guide
              </button>
            </div>
          </div>

          {/* Main Grid: Steps List (Left) & Impact Scope / Review Summary (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Step Cards List */}
            <div className="lg:col-span-7 space-y-4">
              <h3 className="font-headline-sm text-base text-on-surface flex items-center justify-between">
                <span>Execution Sequence</span>
                <span className="text-xs font-code-sm text-on-surface-variant">{plan.steps.length} Ordered Steps</span>
              </h3>

              <div className="space-y-4">
                {plan.steps.map((step) => {
                  const isExpanded = expandedStep === step.stepNumber;
                  return (
                    <div
                      key={step.stepNumber}
                      className={`bg-surface-container border rounded-2xl overflow-hidden transition-all shadow-lg ${
                        step.isWarning ? 'border-amber-500/40' : 'border-outline-variant/40'
                      }`}
                    >
                      {/* Step Card Header */}
                      <div
                        onClick={() => setExpandedStep(isExpanded ? 0 : step.stepNumber)}
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-surface-variant/40 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-lg bg-surface-container-high text-primary font-code-sm font-bold flex items-center justify-center text-xs">
                            {step.stepNumber}
                          </span>
                          <div>
                            <div className="flex items-center gap-2 font-code-sm text-xs font-semibold text-on-surface">
                              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-label-caps ${
                                step.type === 'Modify' ? 'bg-amber-500/20 text-amber-300' : step.type === 'Create' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-primary/20 text-primary'
                              }`}>
                                {step.type}
                              </span>
                              <span>{step.filePath}</span>
                            </div>
                            {step.description && (
                              <div className="text-xs text-on-surface-variant mt-0.5">{step.description}</div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {step.badgeText && (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-code-sm ${
                              step.isWarning ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-surface-container-high text-on-surface-variant'
                            }`}>
                              {step.badgeText}
                            </span>
                          )}
                          <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                            {isExpanded ? 'expand_less' : 'expand_more'}
                          </span>
                        </div>
                      </div>

                      {/* Expanded Git Diff Panel */}
                      {isExpanded && (
                        <div className="border-t border-outline-variant/30 bg-surface-container-lowest p-4 font-code-sm text-xs space-y-2 overflow-x-auto">
                          {step.prerequisiteSteps && step.prerequisiteSteps.length > 0 && (
                            <div className="text-[11px] text-amber-300/80 mb-2 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">account_tree</span>
                              <span>Prerequisite Steps: {step.prerequisiteSteps.map(p => `#${p}`).join(', ')}</span>
                            </div>
                          )}

                          {step.diffHeader && (
                            <div className="text-outline text-[11px] mb-2 font-code-sm select-none">
                              {step.diffHeader}
                            </div>
                          )}

                          {step.diffLines && step.diffLines.length > 0 ? (
                            step.diffLines.map((line, i) => (
                              <div
                                key={i}
                                className={`flex items-center gap-4 px-2 py-0.5 rounded ${
                                  line.type === 'add'
                                    ? 'bg-emerald-500/15 text-emerald-300 font-medium'
                                    : line.type === 'remove'
                                    ? 'bg-error-container/20 text-error'
                                    : 'text-on-surface-variant'
                                }`}
                              >
                                <span className="w-6 text-right opacity-40 select-none text-[11px]">
                                  {line.numAfter || line.numBefore || i + 1}
                                </span>
                                <span className="w-4 select-none text-center font-bold">
                                  {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                                </span>
                                <span className="leading-relaxed">{line.content}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-xs text-on-surface-variant italic">
                              No explicit line diff preview available for this step.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Side Panel: Impact Scope & Review Summary */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Target & Affected Files List */}
              <div className="p-6 bg-surface-container border border-outline-variant/40 rounded-3xl space-y-4 shadow-xl">
                <h3 className="font-headline-sm text-base text-on-surface flex items-center justify-between">
                  <span>Impact Scope</span>
                  <span className="text-xs font-code-sm text-primary">{plan.targetFiles.length} Target / {plan.affectedFiles.length} Affected</span>
                </h3>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {plan.targetFiles.map((tf, i) => (
                    <div key={i} className="flex items-center justify-between text-xs p-2.5 bg-primary/10 border border-primary/20 rounded-xl">
                      <span className="text-primary font-code-sm font-semibold truncate">{tf}</span>
                      <span className="px-2 py-0.5 bg-primary/20 text-primary rounded text-[10px] uppercase font-label-caps">Target</span>
                    </div>
                  ))}
                  {plan.affectedFiles.map((af, i) => (
                    <div key={i} className="flex items-center justify-between text-xs p-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl">
                      <span className="text-on-surface-variant font-code-sm truncate">{af}</span>
                      <span className="px-2 py-0.5 bg-surface-container-high text-on-surface-variant rounded text-[10px] uppercase font-label-caps">Affected</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Review Summary Checklist */}
              <div className="p-6 bg-surface-container border border-outline-variant/40 rounded-3xl space-y-4 shadow-xl">
                <h3 className="font-headline-sm text-base text-on-surface">Review & Verification</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs p-3 bg-surface-container-low rounded-xl">
                    <span className="text-on-surface">AST Symbol Validation</span>
                    <span className="text-emerald-300 font-code-sm font-semibold">{plan.validation.validatedSymbolsCount} Symbols Verified</span>
                  </div>

                  <div className="flex items-center justify-between text-xs p-3 bg-surface-container-low rounded-xl">
                    <span className="text-on-surface">File Integrity</span>
                    {plan.validation.allFilesExist ? (
                      <span className="text-emerald-300 flex items-center gap-1 font-semibold text-[11px]">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        All Files Valid
                      </span>
                    ) : (
                      <span className="text-amber-300 flex items-center gap-1 font-semibold text-[11px]">
                        <span className="material-symbols-outlined text-[16px]">warning</span>
                        {plan.validation.invalidFiles.length} Missing Files
                      </span>
                    )}
                  </div>
                </div>

                {/* Verification Steps */}
                {plan.verificationSteps && plan.verificationSteps.length > 0 && (
                  <div className="pt-2 space-y-2">
                    <div className="text-xs font-semibold text-on-surface">Recommended Verifications:</div>
                    <div className="space-y-1.5">
                      {plan.verificationSteps.map((vs, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-on-surface-variant bg-surface-container-lowest p-2 rounded-xl">
                          <span className="material-symbols-outlined text-primary text-[16px]">fact_check</span>
                          <code className="font-code-sm text-primary">{vs}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warnings List */}
                {plan.warnings && plan.warnings.length > 0 && (
                  <div className="pt-2 space-y-2">
                    <div className="text-xs font-semibold text-amber-300 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">warning</span>
                      <span>Plan Warnings</span>
                    </div>
                    <div className="space-y-1.5">
                      {plan.warnings.map((w, idx) => (
                        <div key={idx} className="text-xs text-amber-200/90 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl leading-relaxed">
                          {w}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    onClick={() => onSelectView('overview')}
                    className="w-full py-2.5 bg-surface-variant hover:bg-surface-container-high text-on-surface text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1"
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
