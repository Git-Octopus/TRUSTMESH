import React, { useState } from 'react';
import StatusBadge from './StatusBadge';
import { formatAddress } from '../utils/formatAddress';
import { formatHash } from '../utils/formatHash';

/**
 * VerifierQueueRow - Expandable row for Verifier queue with inline evidence preview
 */
export default function VerifierQueueRow({
  claim,
  onApprove,
  onReject,
  isProcessing = false
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!claim) return null;

  const claimantAddress =
    claim.userId?.walletAddress ||
    claim.profileId?.walletAddress ||
    (typeof claim.profileId === 'string' ? claim.profileId : '0x...');

  const evidenceUrl = claim.evidenceUrl
    ? (claim.evidenceUrl.startsWith('http') ? claim.evidenceUrl : `http://localhost:5000${claim.evidenceUrl}`)
    : '';

  const isPdf = evidenceUrl.toLowerCase().endsWith('.pdf');
  const isImage = /\.(png|jpe?g|webp|gif)$/i.test(evidenceUrl);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition-all hover:border-slate-700">
      {/* Row Header */}
      <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase bg-slate-800 text-slate-300 border border-slate-700">
              {claim.type}
            </span>
            <StatusBadge status={claim.status} size="sm" />
            {claim.organization && (
              <span className="text-xs text-slate-400 font-medium">
                • {claim.organization}
              </span>
            )}
          </div>

          <h3 className="text-lg font-bold text-white mb-1">{claim.title}</h3>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-mono">
            <span>
              Claimant: <span className="text-slate-300">{formatAddress(claimantAddress)}</span>
            </span>
            {claim.evidenceHash && (
              <span>
                Hash: <span className="text-tm-teal">{formatHash(claim.evidenceHash)}</span>
              </span>
            )}
            <span>
              Date: <span className="text-slate-400">{new Date(claim.createdAt).toLocaleDateString()}</span>
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            {isExpanded ? 'Hide Details ▲' : 'Inspect Evidence ▼'}
          </button>
          <button
            type="button"
            onClick={() => onReject(claim)}
            disabled={isProcessing}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-rose-500/50 text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-40"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => onApprove(claim)}
            disabled={isProcessing}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition-colors disabled:opacity-40 flex items-center gap-1.5"
          >
            {isProcessing ? 'Processing...' : 'Approve on Chain ⚡'}
          </button>
        </div>
      </div>

      {/* Expanded Details & Evidence Viewer */}
      {isExpanded && (
        <div className="p-6 bg-slate-950/70 border-t border-slate-800/80 space-y-6 animate-fadeIn">
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
              Claim Description
            </h4>
            <p className="text-sm text-slate-200 whitespace-pre-wrap bg-slate-900/90 p-4 rounded-xl border border-slate-800">
              {claim.description || 'No description provided.'}
            </p>
          </div>

          {claim.evidenceHash && (
            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                Cryptographic Evidence Fingerprint (SHA-256)
              </h4>
              <div className="font-mono text-xs text-tm-teal bg-slate-900 p-3 rounded-xl border border-slate-800 break-all select-all">
                {claim.evidenceHash}
              </div>
            </div>
          )}

          {/* Inline Evidence Preview */}
          {evidenceUrl ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  Attached Proof Document
                </h4>
                <a
                  href={evidenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-tm-teal hover:underline flex items-center gap-1"
                >
                  Open Original Document ↗
                </a>
              </div>

              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900 p-2 flex justify-center items-center min-h-[220px]">
                {isImage ? (
                  <img
                    src={evidenceUrl}
                    alt="Evidence Preview"
                    className="max-h-96 max-w-full rounded-lg object-contain shadow-md"
                  />
                ) : isPdf ? (
                  <iframe
                    src={evidenceUrl}
                    title="PDF Evidence Viewer"
                    className="w-full h-96 rounded-lg border-0"
                  />
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-slate-400 mb-3">Evidence document file attached.</p>
                    <a
                      href={evidenceUrl}
                      download
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium inline-block"
                    >
                      Download Document
                    </a>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-amber-400/80 italic">No document file uploaded for this claim.</p>
          )}
        </div>
      )}
    </div>
  );
}
