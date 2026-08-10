import React, { useState } from 'react';
import { sampleCodeAuthService } from '../../data/mockData';
import { ViewMode } from '../../types';

interface InvestigationViewProps {
  onSelectView: (view: ViewMode) => void;
}

export const InvestigationView: React.FC<InvestigationViewProps> = ({ onSelectView }) => {
  const [activeTab, setActiveTab] = useState<'auth.service.ts' | 'jwt.strategy.ts'>('auth.service.ts');
  const [queryInput, setQueryInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'user',
      text: 'How does authentication work in this project?'
    },
    {
      role: 'assistant',
      text: 'Authentication is handled primarily by `AuthService` using signed JWT tokens with standard HTTP Bearer headers. When `AuthController.login()` is invoked, credentials are validated and `generateToken()` creates an encrypted payload containing user ID and roles.',
      contextFiles: ['auth.service.ts', 'jwt.strategy.ts', 'user.repository.ts']
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSendQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryInput.trim() || isTyping) return;

    const userMsg = queryInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setQueryInput('');
    setIsTyping(true);

    setTimeout(() => {
      setChatMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: `Analysis for "${userMsg}": The authentication pipeline injects \`JwtStrategy\` into protected NestJS routes using Passport middleware. Token validation checks expiration and verifies secret keys configured in \`auth.config.ts\`.`,
          contextFiles: ['auth.service.ts', 'jwt.strategy.ts']
        }
      ]);
      setIsTyping(false);
    }, 1200);
  };

  return (
    <div className="space-y-6 font-body-md">
      
      {/* Path Header */}
      <div className="flex items-center justify-between pb-4 border-b border-outline-variant/30">
        <div className="flex items-center gap-2 text-xs font-code-sm text-on-surface-variant">
          <span>/</span>
          <span>investigate</span>
          <span>/</span>
          <span className="text-primary font-semibold">auth_flow_analysis</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-surface-container border border-outline-variant/40 rounded-lg text-xs font-code-sm text-primary flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>Context: 4 files analyzed</span>
          </span>
          <button
            onClick={() => onSelectView('plan')}
            className="px-4 py-1.5 bg-primary-container hover:bg-primary-fixed text-on-primary-container rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
          >
            <span>Create Refactor Plan</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* Main Grid: AI Terminal (Left) & Code Inspector (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[560px]">
        
        {/* AI Terminal Chat Interface (Left Column) */}
        <div className="lg:col-span-5 bg-surface-container border border-outline-variant/40 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
          <div className="space-y-6 overflow-y-auto max-h-[480px] pr-2">
            <div className="flex items-center gap-2 text-primary pb-3 border-b border-outline-variant/20">
              <span className="material-symbols-outlined text-[22px]">psychology</span>
              <h3 className="font-headline-sm text-base text-on-surface">AI Code Inspector</h3>
            </div>

            {chatMessages.map((msg, idx) => (
              <div key={idx} className="space-y-3">
                {msg.role === 'user' ? (
                  <div className="p-3.5 bg-surface-container-high rounded-2xl border border-outline-variant/30 text-xs font-body-md text-on-surface ml-6">
                    <div className="text-[10px] text-primary font-code-sm uppercase mb-1">User Query</div>
                    {msg.text}
                  </div>
                ) : (
                  <div className="p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/40 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-primary font-code-sm font-semibold uppercase flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                        Aqua Lens Assistant
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-code-sm">100% confidence</span>
                    </div>

                    <p className="text-xs text-on-surface leading-relaxed">
                      {msg.text}
                    </p>

                    {msg.contextFiles && (
                      <div className="space-y-1.5 pt-2 border-t border-outline-variant/20">
                        <div className="text-[10px] text-on-surface-variant font-label-caps uppercase">Linked Context Cards:</div>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.contextFiles.map((f, i) => (
                            <button
                              key={i}
                              onClick={() => setActiveTab(f as any)}
                              className="px-2.5 py-1 bg-surface-container hover:bg-surface-variant text-primary border border-primary/30 rounded-lg text-xs font-code-sm flex items-center gap-1 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[14px]">description</span>
                              <span>{f}</span>
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
                Analyzing AST symbol references...
              </div>
            )}
          </div>

          {/* Question Input Box */}
          <form onSubmit={handleSendQuery} className="pt-4 border-t border-outline-variant/20 relative">
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Ask a question about auth flow or symbols..."
              className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl py-3 pl-4 pr-12 text-xs font-code-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              className="absolute right-2 top-6 p-1.5 bg-primary text-on-primary rounded-lg hover:bg-primary-fixed transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">send</span>
            </button>
          </form>
        </div>

        {/* Code Inspector (Right Column) */}
        <div className="lg:col-span-7 bg-surface-container-lowest border border-outline-variant/40 rounded-3xl overflow-hidden shadow-xl flex flex-col">
          {/* File Tabs Header */}
          <div className="h-12 bg-surface-container-low px-4 flex items-center justify-between border-b border-outline-variant/30">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('auth.service.ts')}
                className={`px-3 py-1.5 rounded-lg text-xs font-code-sm flex items-center gap-1.5 transition-colors ${
                  activeTab === 'auth.service.ts' ? 'bg-surface-container text-primary font-semibold border border-primary/30' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">description</span>
                <span>src/services/auth.service.ts</span>
              </button>
              <button
                onClick={() => setActiveTab('jwt.strategy.ts')}
                className={`px-3 py-1.5 rounded-lg text-xs font-code-sm flex items-center gap-1.5 transition-colors ${
                  activeTab === 'jwt.strategy.ts' ? 'bg-surface-container text-primary font-semibold border border-primary/30' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">description</span>
                <span>src/strategies/jwt.strategy.ts</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <button
                onClick={() => navigator.clipboard.writeText(sampleCodeAuthService)}
                className="p-1 hover:bg-surface-variant rounded text-on-surface-variant hover:text-primary transition-colors"
                title="Copy snippet"
              >
                <span className="material-symbols-outlined text-[18px]">content_copy</span>
              </button>
            </div>
          </div>

          {/* Syntax Highlighted Code Viewer */}
          <div className="p-4 flex-1 font-code-sm text-xs bg-surface-container-lowest overflow-x-auto space-y-1">
            {sampleCodeAuthService.split('\n').map((line, idx) => {
              const lineNum = idx + 1;
              const isHighlighted = lineNum >= 14 && lineNum <= 25; // Highlight token generation
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-4 px-2 py-0.5 rounded transition-colors ${
                    isHighlighted ? 'bg-primary/10 border-l-2 border-primary font-medium' : 'hover:bg-surface-container/30'
                  }`}
                >
                  <span className="w-8 text-right text-outline opacity-40 select-none">{lineNum}</span>
                  <span className={`leading-relaxed ${isHighlighted ? 'text-primary' : 'text-on-surface-variant'}`}>
                    {line}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
