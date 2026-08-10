import React from 'react';
import { ViewMode } from '../types';
import { Logo } from './Logo';

interface SidebarNavProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  selectedRepo: string;
  onOpenRepoSelector: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  currentView,
  onSelectView,
  selectedRepo,
  onOpenRepoSelector
}) => {
  const navItems = [
    { id: 'overview' as ViewMode, label: 'Overview', icon: 'dashboard' },
    { id: 'architecture' as ViewMode, label: 'Architecture', icon: 'account_tree' },
    { id: 'investigate' as ViewMode, label: 'Investigation', icon: 'search_insights' },
    { id: 'impact' as ViewMode, label: 'Impact Analysis', icon: 'monitoring' },
    { id: 'plan' as ViewMode, label: 'Change Plans', icon: 'checklist_rtl' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-low border-r border-outline-variant/30 z-50 flex flex-col">
      {/* Top Header Logo */}
      <div className="h-16 flex items-center justify-between px-lg mb-sm border-b border-outline-variant/10">
        <button 
          onClick={() => onSelectView('landing')} 
          className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
          title="Return to Aqua Lens Home"
        >
          <Logo size="md" showText={true} />
        </button>
      </div>

      {/* Repository Switcher Pill */}
      <div className="px-md mb-md">
        <button
          onClick={onOpenRepoSelector}
          className="w-full flex items-center justify-between p-2 rounded-lg bg-surface-container border border-outline-variant/30 hover:border-primary/50 text-left transition-all group"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-[18px] text-primary">folder_open</span>
            <span className="font-code-sm text-code-sm text-on-surface truncate">
              {selectedRepo}
            </span>
          </div>
          <span className="material-symbols-outlined text-[16px] text-on-surface-variant group-hover:text-primary transition-colors">
            unfold_more
          </span>
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-sm space-y-xs">
        <div className="px-md py-xs font-label-caps text-label-caps text-on-surface-variant uppercase opacity-50">
          Project
        </div>
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`w-full flex items-center px-md py-sm rounded-lg text-body-sm transition-all text-left ${
                isActive
                  ? 'bg-surface-container-high text-primary font-semibold border-r-2 border-primary shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'
              }`}
            >
              <span className={`material-symbols-outlined mr-3 text-[20px] ${isActive ? 'text-primary' : ''}`}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom User Bar */}
      <div className="p-md border-t border-outline-variant/20">
        <div 
          onClick={() => onSelectView('init-workspace')}
          className="flex items-center gap-sm p-sm hover:bg-surface-variant rounded-lg transition-colors cursor-pointer"
          title="Manage Analysis Workspaces"
        >
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold">
            <span className="material-symbols-outlined text-primary text-[18px]">person</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="text-body-sm font-semibold truncate text-on-surface">Dev Lead</div>
            <div className="text-xs text-on-surface-variant truncate">Workspaces & Settings</div>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant text-[18px]">settings</span>
        </div>
      </div>
    </aside>
  );
};
