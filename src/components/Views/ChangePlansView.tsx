import React, { useState } from 'react';
import { changePlanSteps } from '../../data/mockData';
import { ViewMode } from '../../types';

interface ChangePlansViewProps {
  onSelectView: (view: ViewMode) => void;
}

export const ChangePlansView: React.FC<ChangePlansViewProps> = ({ onSelectView }) => {
  const [expandedStep, setExpandedStep] = useState<string>('step-1');
  const [prCreatedModal, setPrCreatedModal] = useState(false);

  const handleApplyPR = () => {
    setPrCreatedModal(true);
  };

  return (
    <div className="space-y-8 font-body-md">
      
      {/* PR Created Modal Dialog */}
      {prCreatedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
          <div className="bg-surface-container border border-outline-variant/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
              <span className="material-symbols-outlined text-[28px]">check_circle</span>
            </div>
            <h3 className="font-headline-md text-xl text-on-surface">Refactor Plan Attached to PR</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Pull Request <code className="text-primary font-code-sm">#1428 (feat: Google OAuth Integration)</code> has been automatically updated with the generated 4-step execution diffs and schema migration scripts.
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

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant/30">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary text-[22px]">checklist_rtl</span>
            <span className="text-xs font-code-sm text-primary font-semibold uppercase">EXECUTION PLAN PLAN-8492</span>
          </div>
          <h1 className="font-display-lg text-2xl sm:text-3xl text-on-surface flex items-center gap-3">
            <span>Add Google OAuth Provider</span>
            <span className="px-3 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-code-sm">
              Safe to apply
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleApplyPR}
            className="px-4 py-2 bg-surface-container hover:bg-surface-variant border border-outline-variant/40 rounded-xl text-body-sm text-on-surface transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">difference</span>
            Add to PR
          </button>
          <button
            onClick={() => {
              const text = changePlanSteps.map(s => `${s.stepNumber}. ${s.type} ${s.filePath}`).join('\n');
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
            <span className="text-xs font-code-sm text-on-surface-variant">4 Ordered Steps</span>
          </h3>

          <div className="space-y-4">
            {changePlanSteps.map((step) => {
              const isExpanded = expandedStep === step.id;
              return (
                <div
                  key={step.id}
                  className={`bg-surface-container border rounded-2xl overflow-hidden transition-all shadow-lg ${
                    step.isWarning ? 'border-amber-500/40' : 'border-outline-variant/40'
                  }`}
                >
                  {/* Step Card Header */}
                  <div
                    onClick={() => setExpandedStep(isExpanded ? '' : step.id)}
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
                  {isExpanded && step.diffLines && (
                    <div className="border-t border-outline-variant/30 bg-surface-container-lowest p-4 font-code-sm text-xs space-y-1 overflow-x-auto">
                      <div className="text-outline text-[11px] mb-2 font-code-sm select-none">
                        {step.diffHeader}
                      </div>
                      {step.diffLines.map((line, i) => (
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
                            {line.numAfter || line.numBefore}
                          </span>
                          <span className="w-4 select-none text-center font-bold">
                            {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                          </span>
                          <span className="leading-relaxed">{line.content}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side Panel: Impact Scope & Review Summary */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Mini Topology Graph */}
          <div className="p-6 bg-surface-container border border-outline-variant/40 rounded-3xl space-y-4 shadow-xl">
            <h3 className="font-headline-sm text-base text-on-surface">Impact Scope Graph</h3>
            <div className="h-44 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 flex items-center justify-around p-4 relative">
              <div className="p-3 bg-surface-container border border-primary text-primary rounded-xl text-center text-xs font-code-sm">
                Auth Config
              </div>
              <span className="material-symbols-outlined text-primary text-[20px]">arrow_forward</span>
              <div className="p-3 bg-surface-container border border-emerald-500 text-emerald-300 rounded-xl text-center text-xs font-code-sm">
                Google Auth Provider
              </div>
              <span className="material-symbols-outlined text-primary text-[20px]">arrow_forward</span>
              <div className="p-3 bg-surface-container border border-amber-500 text-amber-300 rounded-xl text-center text-xs font-code-sm">
                User DB
              </div>
            </div>
          </div>

          {/* Review Summary Checklist */}
          <div className="p-6 bg-surface-container border border-outline-variant/40 rounded-3xl space-y-4 shadow-xl">
            <h3 className="font-headline-sm text-base text-on-surface">Review Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs p-2 bg-surface-container-low rounded-xl">
                <span className="text-on-surface font-code-sm">src/config/auth.config.ts</span>
                <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 bg-surface-container-low rounded-xl">
                <span className="text-on-surface font-code-sm">src/providers/google-auth.provider.ts</span>
                <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 bg-surface-container-low rounded-xl">
                <span className="text-on-surface font-code-sm">src/services/user.service.ts</span>
                <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 bg-surface-container-low rounded-xl">
                <span className="text-on-surface font-code-sm">db/migrations/20231024_add_google_id.sql</span>
                <span className="material-symbols-outlined text-amber-400 text-[18px]">warning</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => onSelectView('overview')}
                className="w-full py-2 bg-surface-variant hover:bg-surface-container-high text-on-surface text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1"
              >
                <span>Return to Overview</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
