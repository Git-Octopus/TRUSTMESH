import React from 'react';

export default function TrustScoreChart({ score = 0 }) {
  return (
    <div className="p-6 bg-slate-800 rounded-lg text-center">
      <h4 className="text-gray-400 text-sm mb-2">Trust Score</h4>
      <div className="text-5xl font-extrabold text-indigo-400">{score}</div>
    </div>
  );
}
