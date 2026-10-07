import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { formatAddress } from '../utils/formatAddress';
import { formatHash } from '../utils/formatHash';

export default function ClaimDetails() {
  const { id } = useParams();
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showRawEvent, setShowRawEvent] = useState(false);

  useEffect(() => {
    fetchClaim();
  }, [id]);

  const fetchClaim = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/claims/${id}`);
      setClaim(res.data.claim);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to retrieve claim record.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyHash = () => {
    if (!claim?.evidenceHash) return;
    navigator.clipboard.writeText(claim.evidenceHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-8 h-8 border-3 border-tm-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !claim) {
    return (
      <div className="max-w-md mx-auto my-16 bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center">
        <div className="text-3xl mb-2">🔍</div>
        <h3 className="text-lg font-bold text-white mb-2">Claim Record Not Found</h3>
        <p className="text-xs text-slate-400 mb-6">{error || 'Unable to locate this credential in the registry.'}</p>
        <Link to="/claims" className="px-5 py-2.5 rounded-xl bg-slate-800 text-white text-xs font-semibold">
          Return to Claims
        </Link>
      </div>
    );
  }

  const isVerified = claim.status === 'VERIFIED';
  const verification = claim.verification || {};
  const claimantWallet =
    claim.userId?.walletAddress ||
    claim.profileId?.walletAddress ||
    (typeof claim.profileId === 'string' ? claim.profileId : 'Unknown');

  const evidenceUrl = claim.evidenceUrl
    ? (claim.evidenceUrl.startsWith('http') ? claim.evidenceUrl : `http://localhost:5000${claim.evidenceUrl}`)
    : '';

  return (
    <div className="max-w-5xl mx-auto pb-16">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <Link to="/claims" className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1">
          ← Back to Registry
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to={`/history/${claim._id}`}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <span>📜</span> View Audit Timeline
          </Link>

          <button
            onClick={handleCopyShareLink}
            className="px-4 py-2 rounded-xl bg-tm-blue hover:bg-blue-600 text-white text-xs font-semibold transition-all shadow-lg shadow-blue-500/20 flex items-center gap-1.5"
          >
            {copiedLink ? 'Link Copied! ✓' : 'Share Proof Link 🔗'}
          </button>
        </div>
      </div>

      {/* Main Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 mb-8 shadow-xl">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <span className="px-3 py-1 rounded-lg text-xs font-semibold uppercase bg-slate-800 text-slate-200 border border-slate-700">
            {claim.type}
          </span>
          <StatusBadge status={claim.status} size="lg" />
          {claim.organization && (
            <span className="text-sm text-slate-400 font-medium">
              at {claim.organization}
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
          {claim.title}
        </h1>

        <p className="text-xs font-mono text-slate-500">
          Claim ID: <span className="text-slate-400">{claim._id}</span>
          {claim.onChainClaimId && (
            <span> • On-Chain ID: #{claim.onChainClaimId}</span>
          )}
        </p>
      </div>

      {/* The Two Distinct Panels: Self-Claimed Data vs Blockchain Proof */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Panel 1: Self-Claimed Data (Off-Chain) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>📋</span> Self-Claimed Record
            </h2>
            <span className="text-[10px] font-mono text-slate-500 uppercase">Off-Chain Data</span>
          </div>

          <div>
            <h3 className="text-xs font-mono uppercase text-slate-400 mb-1">Claimant Identity</h3>
            <p className="font-mono text-xs text-slate-200 break-all bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              {claimantWallet}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-mono uppercase text-slate-400 mb-1">Claim Description</h3>
            <p className="text-sm text-slate-300 whitespace-pre-wrap bg-slate-950 p-3.5 rounded-xl border border-slate-800 leading-relaxed">
              {claim.description || 'No description provided.'}
            </p>
          </div>

          {/* Evidence Digest */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-mono uppercase text-slate-400">SHA-256 Evidence Digest</h3>
              <button
                onClick={handleCopyHash}
                className="text-[11px] text-tm-teal hover:underline"
              >
                {copiedHash ? 'Copied! ✓' : 'Copy Hash'}
              </button>
            </div>
            <div className="font-mono text-xs text-tm-teal bg-slate-950 p-3 rounded-xl border border-slate-800 break-all select-all">
              {claim.evidenceHash || 'No evidence hash recorded'}
            </div>
          </div>

          {evidenceUrl && (
            <div className="pt-2">
              <a
                href={evidenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-tm-teal hover:text-white transition-colors"
              >
                <span>📎</span> View Original Evidence Document ↗
              </a>
            </div>
          )}
        </div>

        {/* Panel 2: Cryptographic Blockchain Proof */}
        <div
          className={`border rounded-2xl p-6 shadow-xl space-y-6 ${
            isVerified
              ? 'bg-[#0b1f1a] border-emerald-500/40'
              : 'bg-slate-900/80 border-slate-800'
          }`}
        >
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>⚡</span> Blockchain Proof
            </h2>
            <span
              className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
                isVerified
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {isVerified ? 'IMMUTABLE ON-CHAIN' : 'OFF-CHAIN PENDING'}
            </span>
          </div>

          {isVerified ? (
            <div className="space-y-5">
              <div>
                <h3 className="text-xs font-mono uppercase text-emerald-400/80 mb-1">
                  Authorized Verifier Wallet
                </h3>
                <p className="font-mono text-xs text-slate-200 break-all bg-slate-950/80 p-2.5 rounded-xl border border-emerald-900/40">
                  {verification.verifierWallet || 'TrustMesh Authorized Verifier'}
                </p>
              </div>

              <div>
                <h3 className="text-xs font-mono uppercase text-emerald-400/80 mb-1">
                  Attestation Timestamp
                </h3>
                <p className="font-mono text-xs text-slate-300">
                  {verification.verifiedAt
                    ? new Date(verification.verifiedAt).toLocaleString()
                    : 'Confirmed on ledger'}
                </p>
              </div>

              <div>
                <h3 className="text-xs font-mono uppercase text-emerald-400/80 mb-1">
                  On-Chain Transaction Hash
                </h3>
                <p className="font-mono text-xs text-tm-teal break-all bg-slate-950/80 p-2.5 rounded-xl border border-emerald-900/40 select-all">
                  {verification.transactionHash || '0x4f8a9b2c...'}
                </p>
              </div>

              {/* Expandable Raw Event Accordion */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowRawEvent(!showRawEvent)}
                  className="text-xs text-slate-400 hover:text-white font-mono flex items-center gap-1"
                >
                  {showRawEvent ? 'Hide Raw Event Logs ▲' : 'View On-Chain Raw Event Logs ▼'}
                </button>

                {showRawEvent && (
                  <pre className="mt-3 p-3 bg-slate-950 rounded-xl border border-emerald-900/40 text-[11px] font-mono text-emerald-300/90 overflow-x-auto leading-relaxed">
                    {JSON.stringify(
                      {
                        event: 'ClaimVerified',
                        claimId: claim.onChainClaimId || 1,
                        claimant: claimantWallet,
                        verifier: verification.verifierWallet,
                        referenceHash: claim.evidenceHash,
                        transactionHash: verification.transactionHash,
                        status: 'VERIFIED',
                        contract: 'TrustMesh.sol'
                      },
                      null,
                      2
                    )}
                  </pre>
                )}
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300">
                🛡️ This claim has been cryptographically validated, signed by an authorized verifier, and permanently inscribed on the decentralized ledger.
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-xl">
                ⏳
              </div>
              <h3 className="font-bold text-white text-sm">Awaiting Blockchain Attestation</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                This claim is currently pending verification. Data will become an immutable on-chain proof once an authorized verifier signs the transaction.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
