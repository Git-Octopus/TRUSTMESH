import React from 'react';
import { useTheme } from '../hooks/useTheme';

export default function ThemeToggle({ showLabel = false, className = '' }) {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={`relative inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-300 border shadow-sm group select-none ${
        isDark
          ? 'bg-slate-800 hover:bg-slate-700/80 text-amber-300 border-slate-700 hover:border-amber-400/40 hover:shadow-amber-500/10'
          : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200 hover:border-slate-300 hover:shadow-slate-400/10'
      } ${className}`}
    >
      <span className="text-base transition-transform duration-300 transform group-hover:rotate-12 group-hover:scale-110">
        {isDark ? '☀️' : '🌙'}
      </span>
      {showLabel && (
        <span className="font-mono text-[11px] tracking-tight">
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
}
