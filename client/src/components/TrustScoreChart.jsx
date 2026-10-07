import React from 'react';

/**
 * TrustScoreChart - Visualizes cryptographic reputation score and weighting breakdown
 * Breakdown weights per Build Plan: Organization=10, Mentor/Client=8, Peer=3, Self=0
 */
export default function TrustScoreChart({
  score = 50,
  breakdown = {},
  badges = [],
  walletAddress = ''
}) {
  const normalizedScore = Math.min(100, Math.max(0, score));

  // Determine score color grade
  let colorClass = 'text-slate-400 stroke-slate-400';
  let badgeColor = 'bg-slate-800 text-slate-300';
  if (normalizedScore >= 90) {
    colorClass = 'text-emerald-400 stroke-emerald-400';
    badgeColor = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  } else if (normalizedScore >= 75) {
    colorClass = 'text-tm-teal stroke-tm-teal';
    badgeColor = 'bg-sky-500/15 text-sky-300 border-sky-500/30';
  } else if (normalizedScore >= 60) {
    colorClass = 'text-tm-blue stroke-tm-blue';
    badgeColor = 'bg-blue-500/15 text-blue-300 border-blue-500/30';
  }

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * normalizedScore) / 100;

  const sources = [
    { label: 'Organization Verification', points: '+10 pts each', count: breakdown.organization || 0, color: 'bg-emerald-500' },
    { label: 'Mentor / Client Verification', points: '+8 pts each', count: breakdown.mentorClient || 0, color: 'bg-sky-500' },
    { label: 'Peer Verification', points: '+3 pts each', count: breakdown.peer || 0, color: 'bg-indigo-500' },
    { label: 'Self-Claimed (Unverified)', points: '0 pts', count: breakdown.self || 0, color: 'bg-slate-600' }
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-center">
      <h3 className="text-xl font-bold text-white mb-1">Cryptographic Trust Score</h3>
      {walletAddress && (
        <p className="font-mono text-xs text-slate-400 mb-6 truncate">{walletAddress}</p>
      )}

      {/* Radial Gauge */}
      <div className="relative inline-flex items-center justify-center my-4">
        <svg className="w-52 h-52 sm:w-60 sm:h-60 transform -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            className="stroke-slate-800"
            strokeWidth="14"
            fill="transparent"
          />
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            className={`${colorClass} transition-all duration-1000 ease-out`}
            strokeWidth="14"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        <div className="absolute flex flex-col items-center justify-center">
          <span className={`text-5xl sm:text-6xl font-extrabold tracking-tight ${colorClass}`}>
            {normalizedScore}
          </span>
          <span className="text-xs font-mono uppercase tracking-widest text-slate-500 mt-1">
            / 100 MAX
          </span>
        </div>
      </div>

      {/* Badges Earned */}
      {badges && badges.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mt-4 mb-8">
          {badges.map((b) => (
            <span
              key={b}
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${badgeColor} shadow-sm`}
            >
              🛡️ {b}
            </span>
          ))}
        </div>
      )}

      {/* Source Breakdown Bars */}
      <div className="mt-6 pt-6 border-t border-slate-800/80 text-left space-y-4">
        <h4 className="text-sm font-semibold text-slate-300 mb-3">Verification Source Breakdown</h4>
        {sources.map((src) => (
          <div key={src.label} className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/60">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-slate-300 font-medium flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${src.color}`} />
                {src.label}
              </span>
              <span className="font-mono text-slate-400">
                {src.count} verified ({src.points})
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full ${src.color} transition-all duration-500`}
                style={{ width: `${Math.min(src.count * 20, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Required Transparency Disclaimer */}
      <p className="mt-6 text-xs text-slate-500 italic">
        "This is a summary score; verification records are the actual evidence."
      </p>
    </div>
  );
}
