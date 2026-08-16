import React from 'react';

export default function OtpInput({ value, onChange }) {
  return (
    <input
      type="text"
      maxLength={6}
      value={value || ''}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder="000000"
      className="tracking-widest text-center px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white font-mono text-xl focus:outline-none"
    />
  );
}
