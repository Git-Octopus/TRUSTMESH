import React, { useState } from 'react';
import StatusBadge from './StatusBadge';
import { formatAddress } from '../utils/formatAddress';
import { formatHash } from '../utils/formatHash';

/**
 * VerifierQueueRow - Expandable row for Verifier queue with inline evidence preview
 * and rich claimant identity context.
 */
export default function VerifierQueueRow({
  claim,
  onApprove,
  onReject,
  isProcessing = false
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!claim) return null;

  const claimantUser = claim.userId && typeof claim.userId === 'object' ? claim.userId : null;
  const claimantAddress =
    claimantUser?.walletAddress ||
    claim.profileId?.walletAddress ||
    (typeof claim.profileId === 'string' ? claim.profileId : '0x...');

  const claimantName = claimantUser?.name || claim.profileId?.name || 'Anonymous Claimant';
  const emailVerified = Boolean(claimantUser?.emailVerified);

  // Normalize evidenceUrl to use relative /uploads path so Nginx proxies it seamlessly on port 5173
  let evidenceUrl = claim.evidenceUrl || '';
  if (evidenceUrl) {
    if (evidenceUrl.startsWith('http://localhost:5000')) {
      evidenceUrl = evidenceUrl.replace('http://localhost:5000', '');
    } else if (!evidenceUrl.startsWith('http') && !evidenceUrl.startsWith('/')) {
      evidenceUrl = `/${evidenceUrl}`;
    }
  }

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

          <h3 className="text-lg font-bold text-white mb-1.5">{claim.title}</h3>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="text-slate-400">Claimant:</span>
              <strong className="text-white font-medium">{claimantName}</strong>
              <span className="font-mono text-slate-400">({formatAddress(claimantAddress)})</span>
              {emailVerified ? (
                <span className="text-emerald-400 text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                  ✓ Email Verified
                </span>
              ) : (
                <span className="text-amber-400 text-[10px] font-medium bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
                  Unverified Email
                </span>
              )}
            </span>
            {claim.evidenceHash && (
              <span className="font-mono">
                Fingerprint: <span className="text-tm-teal">{formatHash(claim.evidenceHash)}</span>
              </span>
            )}
            <span>
              Submitted: <span className="text-slate-300">{new Date(claim.createdAt).toLocaleDateString()}</span>
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
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
            {isProcessing ? (
              <>
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>Approve on Chain ⚡</span>
            )}
          </button>
        </div>
      </div>

      {/* Expanded Details & Evidence Viewer */}
      {isExpanded && (
        <div className="p-6 bg-slate-950/70 border-t border-slate-800/80 space-y-6 animate-fadeIn">
          {/* Claimant Context Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-900/80 p-4 rounded-xl border border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Claimant Full Name:</span>
              <span className="text-slate-100 font-bold text-sm">{claimantName}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Wallet Address:</span>
              <span className="font-mono text-slate-200 select-all">{claimantAddress}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Email Status:</span>
              <span className={emailVerified ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                {emailVerified ? '✓ Cryptographically Verified' : 'Pending Verification'}
              </span>
            </div>
          </div>

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
                  className="text-xs text-tm-teal hover:underline flex items-center gap-1 font-semibold"
                >
                  Open Original Document ↗
                </a>
              </div>

              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900 p-2 flex justify-center items-center min-h-[260px]">
                {isImage ? (
                  <img
                    src={evidenceUrl}
                    alt="Evidence Preview"
                    className="max-h-96 max-w-full rounded-lg object-contain shadow-md"
                  />
                ) : isPdf ? (
                  <div className="w-full flex flex-col items-center">
                    <object
                      data={evidenceUrl}
                      type="application/pdf"
                      className="w-full h-96 rounded-lg border-0"
                    >
                      <div className="text-center py-8">
                        <p className="text-sm text-slate-300 mb-3">PDF preview unavailable in current browser view.</p>
                        <a
                          href={evidenceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold inline-block"
                        >
                          Open PDF in New Window ↗
                        </a>
                      </div>
                    </object>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-slate-400 mb-3">Evidence document attached ({claim.title}).</p>
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
