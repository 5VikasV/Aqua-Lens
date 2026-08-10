import React, { useState } from 'react';
import { affectedFilesList } from '../../data/mockData';
import { ViewMode } from '../../types';

interface ImpactAnalysisViewProps {
  onSelectView: (view: ViewMode) => void;
}

export const ImpactAnalysisView: React.FC<ImpactAnalysisViewProps> = ({ onSelectView }) => {
  const [targetEntity, setTargetEntity] = useState('UserService');
  const [copiedLink, setCopiedLink] = useState(false);

  const handleShare = () => {
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-8 font-body-md">
      
      {/* Toast Alert */}
      {copiedLink && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2 bg-primary text-on-primary font-semibold text-xs rounded-xl shadow-2xl flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">share</span>
          Impact Analysis link copied to clipboard!
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant/30">
        <div>
          <div className="text-xs font-label-caps text-on-surface-variant uppercase tracking-wider mb-1">
            Blast Radius Evaluation
          </div>
          <h1 className="font-display-lg text-2xl sm:text-3xl text-on-surface flex items-center gap-3">
            <span>Impact Analysis:</span>
            <select
              value={targetEntity}
              onChange={(e) => setTargetEntity(e.target.value)}
              className="bg-surface-container border border-primary/40 text-primary font-code-md text-xl rounded-xl px-3 py-1 outline-none cursor-pointer hover:border-primary"
            >
              <option value="UserService">UserService</option>
              <option value="AuthService">AuthService</option>
              <option value="PaymentProcessor">PaymentProcessor</option>
            </select>
          </h1>
        </div>

        <div className="flex items-center gap-3">
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
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-error text-[22px]">target</span>
                <span className="font-headline-sm text-base text-on-surface">Blast Radius Visualization</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-code-sm">
                <span className="px-2.5 py-0.5 bg-error-container/30 text-error border border-error/40 rounded-full font-semibold">
                  3 Critical Breaks
                </span>
                <span className="px-2.5 py-0.5 bg-surface-container-high text-on-surface-variant rounded-full">
                  9 Indirect Effects
                </span>
              </div>
            </div>

            {/* Blast Diagram Container */}
            <div className="relative h-80 my-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 flex items-center justify-center overflow-hidden">
              {/* Ripple Circles */}
              <div className="absolute w-72 h-72 rounded-full border border-error/20 animate-ping opacity-20" />
              <div className="absolute w-56 h-56 rounded-full border border-error/30" />
              <div className="absolute w-36 h-36 rounded-full border border-amber-500/30" />

              {/* Connecting Lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <line x1="50%" y1="50%" x2="20%" y2="20%" stroke="#ffb4ab" strokeWidth="2" strokeDasharray="4" />
                <line x1="50%" y1="50%" x2="80%" y2="20%" stroke="#ffb4ab" strokeWidth="2" strokeDasharray="4" />
                <line x1="50%" y1="50%" x2="20%" y2="80%" stroke="#ffb4ab" strokeWidth="2" strokeDasharray="4" />
                <line x1="50%" y1="50%" x2="80%" y2="80%" stroke="#c8c6c5" strokeWidth="1.5" />
              </svg>

              {/* Center Target Node */}
              <div className="relative z-10 p-4 bg-error-container border-2 border-error text-on-error-container rounded-2xl shadow-2xl text-center animate-pulse">
                <div className="text-[10px] uppercase font-label-caps tracking-wider text-error">Target Entity</div>
                <div className="font-headline-sm text-base font-bold font-code-md">{targetEntity}</div>
              </div>

              {/* Surrounding Affected Nodes */}
              <div className="absolute top-6 left-12 px-3 py-1.5 bg-surface-container border border-error/50 text-error rounded-xl text-xs font-code-sm shadow-lg">
                AuthController.ts (Lvl 1)
              </div>
              <div className="absolute top-6 right-12 px-3 py-1.5 bg-surface-container border border-error/50 text-error rounded-xl text-xs font-code-sm shadow-lg">
                SessionManager.ts (Lvl 1)
              </div>
              <div className="absolute bottom-6 left-12 px-3 py-1.5 bg-surface-container border border-error/50 text-error rounded-xl text-xs font-code-sm shadow-lg">
                ProfileView.tsx (Lvl 1)
              </div>
              <div className="absolute bottom-6 right-12 px-3 py-1.5 bg-surface-container border border-outline-variant text-on-surface-variant rounded-xl text-xs font-code-sm shadow-lg">
                api/routes.ts (Lvl 2)
              </div>
            </div>
          </div>

          <div className="p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs text-on-surface-variant flex items-center justify-between">
            <span>Estimated Refactor Time: <strong>~2.5 hours</strong></span>
            <span className="font-code-sm text-primary">Automated Plan Ready</span>
          </div>
        </div>

        {/* Affected Files Sidebar */}
        <div className="lg:col-span-5 bg-surface-container border border-outline-variant/40 rounded-3xl p-6 space-y-6 shadow-xl">
          <h3 className="font-headline-sm text-lg text-on-surface flex items-center justify-between">
            <span>Affected File Manifest</span>
            <span className="text-xs font-code-sm text-on-surface-variant">{affectedFilesList.length} Files</span>
          </h3>

          <div className="space-y-2 overflow-y-auto max-h-[440px] pr-1">
            {affectedFilesList.map((file) => (
              <div
                key={file.id}
                className={`p-3 rounded-2xl border transition-colors flex items-center justify-between ${
                  file.isCritical
                    ? 'bg-error-container/20 border-error/40 text-error'
                    : 'bg-surface-container-low border-outline-variant/30 text-on-surface'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[18px]">
                    {file.icon}
                  </span>
                  <div>
                    <div className="font-code-sm text-xs font-semibold">{file.path}</div>
                    <div className="text-[10px] opacity-70 font-code-sm">
                      {file.isCritical ? 'Direct Dependency (Critical)' : `Indirect Effect (Level ${file.level})`}
                    </div>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-code-sm uppercase ${
                  file.isCritical ? 'bg-error/20 text-error' : 'bg-surface-container-high text-on-surface-variant'
                }`}>
                  Lvl {file.level}
                </span>
              </div>
            ))}
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
