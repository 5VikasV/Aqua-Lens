import React, { useState, useEffect } from 'react';
import { ViewMode } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectView: (view: ViewMode) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onSelectView }) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open search modal
          // Handled via parent props
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    { type: 'View', title: 'Open Architecture Graph Topology', icon: 'account_tree', action: () => onSelectView('architecture') },
    { type: 'View', title: 'Open AI Investigation & Code Inspector', icon: 'search_insights', action: () => onSelectView('investigate') },
    { type: 'View', title: 'Open Impact Analysis & Blast Radius', icon: 'monitoring', action: () => onSelectView('impact') },
    { type: 'View', title: 'Open Change Execution Plans', icon: 'checklist_rtl', action: () => onSelectView('plan') },
    { type: 'View', title: 'Open Project Overview', icon: 'dashboard', action: () => onSelectView('overview') },
    { type: 'View', title: 'Initialize Workspace with new Repo', icon: 'add_circle', action: () => onSelectView('init-workspace') },
    { type: 'File', title: 'src/services/auth.service.ts', icon: 'description', action: () => onSelectView('investigate') },
    { type: 'File', title: 'src/config/auth.config.ts', icon: 'description', action: () => onSelectView('plan') },
    { type: 'Finding', title: 'Circular dependency in /services/auth', icon: 'warning', action: () => onSelectView('overview') },
  ];

  const filtered = actions.filter(item => 
    item.title.toLowerCase().includes(query.toLowerCase()) || 
    item.type.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-background/80 backdrop-blur-md px-4">
      <div className="w-full max-w-2xl bg-surface-container border border-outline-variant/40 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Header Input */}
        <div className="p-4 border-b border-outline-variant/30 flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[22px]">search</span>
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, file name, or finding..."
            className="flex-1 bg-transparent text-on-surface placeholder:text-on-surface-variant/60 font-code-md text-sm outline-none"
          />
          <button 
            onClick={onClose}
            className="px-2 py-1 bg-surface-variant hover:bg-surface-container-high rounded text-xs font-code-sm text-on-surface-variant"
          >
            ESC
          </button>
        </div>

        {/* Results list */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant text-sm">
              No results found for "{query}"
            </div>
          ) : (
            filtered.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  item.action();
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-surface-variant/60 text-left transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors text-[20px]">
                    {item.icon}
                  </span>
                  <span className="text-sm font-body-md text-on-surface group-hover:text-primary transition-colors">
                    {item.title}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-label-caps bg-surface-variant text-on-surface-variant uppercase">
                  {item.type}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="p-3 bg-surface-container-low border-t border-outline-variant/20 flex items-center justify-between text-xs text-on-surface-variant">
          <span>Tip: Use arrow keys to navigate, Enter to select</span>
          <span className="font-code-sm">Aqua Lens Search v2.4</span>
        </div>
      </div>
    </div>
  );
};
