import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import { formatHash } from '../utils/formatHash';

/**
 * ClaimCard - Standard presentation card for user & verifier claims
 */
export default function ClaimCard({ claim, onAction, actionLabel = 'View Proof' }) {
  if (!claim) return null;

  const dateStr = claim.createdAt
    ? new Date(claim.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : '';

  return (
    <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 transition-all shadow-md hover:shadow-xl group">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
            {claim.type || 'Skill'}
          </span>
          {claim.organization && (
            <span className="text-xs text-slate-400 font-medium">
              at {claim.organization}
            </span>
          )}
        </div>
        <StatusBadge status={claim.status} size="sm" />
      </div>

      <h3 className="text-lg font-bold text-white group-hover:text-tm-teal transition-colors mb-2">
        {claim.title}
      </h3>

      {claim.description && (
        <p className="text-sm text-slate-400 line-clamp-2 mb-4">
          {claim.description}
        </p>
      )}

      {claim.evidenceHash && (
        <div className="mb-4 py-1.5 px-3 bg-slate-950/60 rounded-lg border border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-mono text-[10px]">SHA-256</span>
          <span className="font-mono text-slate-300 text-[11px]">
            {formatHash(claim.evidenceHash)}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-slate-800/60 text-xs">
        <span className="text-slate-500">{dateStr}</span>
        {onAction ? (
          <button
            onClick={() => onAction(claim)}
            className="text-tm-teal hover:text-white font-medium transition-colors"
          >
            {actionLabel} →
          </button>
        ) : (
          <Link
            to={`/claim/${claim._id}`}
            className="text-tm-teal hover:text-white font-medium transition-colors"
          >
            {actionLabel} →
          </Link>
        )}
      </div>
    </div>
  );
}
