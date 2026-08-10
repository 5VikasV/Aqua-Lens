import React from 'react';

interface TopSearchHeaderProps {
  onOpenSearch: () => void;
  onOpenHelpModal: () => void;
}

export const TopSearchHeader: React.FC<TopSearchHeaderProps> = ({
  onOpenSearch,
  onOpenHelpModal
}) => {
  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-surface-container/80 backdrop-blur-xl border-b border-outline-variant/30 z-40 flex items-center justify-between px-lg">
      <div className="flex-1 max-w-xl">
        <button
          onClick={onOpenSearch}
          className="w-full relative flex items-center group text-left cursor-pointer"
        >
          <span className="material-symbols-outlined absolute left-3 text-on-surface-variant group-hover:text-primary transition-colors text-[20px]">
            search
          </span>
          <div className="w-full bg-surface-variant/50 border border-outline-variant/50 rounded-xl py-2 pl-10 pr-12 text-body-sm font-code-md text-on-surface-variant/70 group-hover:border-primary/50 transition-colors">
            Search codebase... (⌘K)
          </div>
          <div className="absolute right-3 flex items-center gap-1 opacity-60">
            <span className="px-1.5 py-0.5 bg-surface-container-highest rounded text-[10px] font-code-sm border border-outline-variant">
              ⌘
            </span>
            <span className="px-1.5 py-0.5 bg-surface-container-highest rounded text-[10px] font-code-sm border border-outline-variant">
              K
            </span>
          </div>
        </button>
      </div>

      <div className="flex items-center gap-md ml-lg">
        <button 
          onClick={onOpenSearch}
          className="p-sm hover:bg-surface-variant rounded-full transition-colors relative text-on-surface-variant hover:text-on-surface"
          title="Notifications"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
        </button>
        <button 
          onClick={onOpenHelpModal}
          className="p-sm hover:bg-surface-variant rounded-full transition-colors text-on-surface-variant hover:text-on-surface"
          title="Help & Documentation"
        >
          <span className="material-symbols-outlined text-[20px]">help</span>
        </button>
      </div>
    </header>
  );
};
