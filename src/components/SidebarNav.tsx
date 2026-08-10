import React from 'react';
import { ViewMode } from '../types';
import { Logo } from './Logo';

interface SidebarNavProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  selectedRepo: string;
  onOpenRepoSelector: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  currentView,
  onSelectView,
  selectedRepo,
  onOpenRepoSelector,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const navItems = [
    { id: 'overview' as ViewMode, label: 'Overview', icon: 'dashboard' },
    { id: 'architecture' as ViewMode, label: 'Architecture', icon: 'account_tree' },
    { id: 'investigate' as ViewMode, label: 'Investigation', icon: 'search_insights' },
    { id: 'impact' as ViewMode, label: 'Impact Analysis', icon: 'monitoring' },
    { id: 'plan' as ViewMode, label: 'Change Plans', icon: 'checklist_rtl' },
  ];

  return (
    <aside className={`fixed left-0 top-0 h-full bg-surface-container-low border-r border-outline-variant/20 z-50 flex flex-col transition-[width] duration-300 ease-in-out ${
      isCollapsed ? 'w-16' : 'w-[260px]'
    }`}>
      {/* Top Header Logo & Collapse Toggle */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-outline-variant/10 shrink-0">
        {!isCollapsed ? (
          <>
            <button 
              onClick={() => onSelectView('landing')} 
              className="flex items-center gap-2 text-left hover:opacity-85 transition-opacity"
              title="Return to Aqua Lens Home"
            >
              <Logo size="md" showText={true} />
            </button>
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="p-1.5 rounded-lg text-on-surface-variant/70 hover:text-on-surface hover:bg-surface-variant/50 transition-colors"
                title="Collapse Sidebar"
              >
                <span className="material-symbols-outlined text-[20px]">menu_open</span>
              </button>
            )}
          </>
        ) : (
          <div className="w-full flex items-center justify-center">
            {onToggleCollapse ? (
              <button
                onClick={onToggleCollapse}
                className="p-2 rounded-xl text-primary hover:bg-primary/10 transition-colors"
                title="Expand Sidebar"
              >
                <span className="material-symbols-outlined text-[22px]">side_navigation</span>
              </button>
            ) : (
              <button 
                onClick={() => onSelectView('landing')} 
                className="hover:opacity-85 transition-opacity"
                title="Return to Aqua Lens Home"
              >
                <Logo size="sm" showText={false} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Workspace Selector Card */}
      <div className="mt-4 px-3 mb-3 shrink-0">
        {!isCollapsed ? (
          <button
            onClick={onOpenRepoSelector}
            className="w-full group relative flex items-center justify-between p-3 rounded-xl bg-surface-container/60 hover:bg-surface-container border border-outline-variant/25 hover:border-primary/40 text-left transition-all duration-200 shadow-xs"
            title="Switch active workspace"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-[18px]">folder_open</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-code-sm text-primary uppercase tracking-wider font-semibold">Active Workspace</span>
                <span className="font-code-sm text-code-sm text-on-surface truncate group-hover:text-primary transition-colors">
                  {selectedRepo}
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant/60 group-hover:text-primary transition-colors shrink-0 ml-1">
              unfold_more
            </span>
          </button>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={onOpenRepoSelector}
              className="w-10 h-10 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 flex items-center justify-center text-primary transition-colors"
              title={`Active Workspace: ${selectedRepo} (Click to switch)`}
            >
              <span className="material-symbols-outlined text-[20px]">folder_open</span>
            </button>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto">
        {!isCollapsed && (
          <div className="px-3 pt-2 pb-1 text-[11px] font-label-caps text-on-surface-variant/50 uppercase tracking-widest font-semibold">
            Code Intelligence
          </div>
        )}

        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full h-[44px] flex items-center rounded-xl transition-all duration-200 text-left ${
                isCollapsed ? 'justify-center px-0' : 'px-3.5 gap-3'
              } ${
                isActive
                  ? 'bg-primary/10 text-primary font-semibold relative before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-5 before:bg-primary before:rounded-r-full shadow-xs'
                  : 'text-on-surface-variant/75 hover:bg-surface-variant/40 hover:text-on-surface'
              }`}
            >
              <span className={`material-symbols-outlined shrink-0 text-[20px] transition-colors ${
                isActive ? 'text-primary' : 'text-on-surface-variant/80'
              }`}>
                {item.icon}
              </span>
              {!isCollapsed && (
                <span className="text-body-sm font-medium tracking-wide truncate">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom User Bar */}
      <div className="mt-auto p-3 border-t border-outline-variant/15 shrink-0">
        {!isCollapsed ? (
          <div 
            onClick={onOpenRepoSelector}
            className="flex items-center gap-3 p-2.5 hover:bg-surface-variant/50 rounded-xl transition-colors cursor-pointer group"
            title="Manage Analysis Workspaces & Settings"
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-semibold shrink-0">
              <span className="material-symbols-outlined text-primary text-[18px]">person</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-body-sm font-semibold truncate text-on-surface group-hover:text-primary transition-colors">Dev Lead</div>
              <div className="text-[11px] text-on-surface-variant/70 truncate">Workspaces & Settings</div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant/60 group-hover:text-on-surface text-[18px] transition-colors">settings</span>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={onOpenRepoSelector}
              className="w-10 h-10 rounded-xl hover:bg-surface-variant/50 flex items-center justify-center text-on-surface-variant/80 hover:text-on-surface transition-colors"
              title="Workspaces & Settings"
            >
              <span className="material-symbols-outlined text-[20px]">settings</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
