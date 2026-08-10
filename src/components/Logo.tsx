import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true, className = '' }) => {
  const iconSizeClass = size === 'sm' ? 'h-6 w-6' : size === 'lg' ? 'h-10 w-10' : 'h-8 w-8';
  const textClass = size === 'sm' ? 'text-body-md font-semibold' : size === 'lg' ? 'text-headline-md' : 'text-headline-sm';

  return (
    <div className={`flex items-center gap-sm ${className}`}>
      {/* Precision Lens Shutter Logo SVG */}
      <div className={`relative flex items-center justify-center ${iconSizeClass} text-primary-fixed`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" stroke="currentColor">
          <circle cx="50" cy="50" r="44" strokeWidth="6" className="text-on-surface/80" />
          <path d="M 50 10 L 85 30 L 50 50 Z" fill="var(--color-primary-fixed)" stroke="none" opacity="0.9" />
          <path d="M 85 30 L 85 70 L 50 50 Z" strokeWidth="5" className="text-on-surface" />
          <path d="M 85 70 L 50 90 L 50 50 Z" strokeWidth="5" className="text-on-surface" />
          <path d="M 50 90 L 15 70 L 50 50 Z" strokeWidth="5" className="text-on-surface" />
          <path d="M 15 70 L 15 30 L 50 50 Z" strokeWidth="5" className="text-on-surface" />
          <path d="M 15 30 L 50 10 L 50 50 Z" strokeWidth="5" className="text-on-surface" />
          <circle cx="50" cy="50" r="16" strokeWidth="5" className="text-on-surface" />
        </svg>
      </div>
      {showText && (
        <span className={`font-headline-sm text-on-surface tracking-tight ${textClass}`}>
          Aqua Lens
        </span>
      )}
    </div>
  );
};
