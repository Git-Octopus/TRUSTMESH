import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useWallet } from '../hooks/useWallet';
import VerifierQueueRow from '../components/VerifierQueueRow';
import TxStatusModal from '../components/TxStatusModal';
import { verifyOnChainClaim, rejectOnChainClaim, createOnChainClaim } from '../services/web3';

export default function VerifierDashboard() {
  const { walletAddress, user } = useWallet();
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'users'

  // Queue state
  const [queue, setQueue] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [processingClaimId, setProcessingClaimId] = useState(null);

  // Users Directory state
  const [directory, setDirectory] = useState([]);
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUser, setExpandedUser] = useState(null);

  // Flag/Suspend Modal State
  const [suspendModal, setSuspendModal] = useState({
    isOpen: false,
    user: null,
    reason: '',
  });

  // Reject Claim Modal State
  const [rejectModal, setRejectModal] = useState({
    isOpen: false,
    claim: null,
    reason: '',
  });

  // MetaMask Tx Modal State
  const [txModal, setTxModal] = useState({
    isOpen: false,
    status: 'signing',
    title: 'Claim Verification',
    message: '',
    txHash: '',
    error: '',
  });

  const isPendingApproval = user?.verifierStatus === 'pending_approval';

  useEffect(() => {
    fetchQueue();
    fetchUsersDirectory();
  }, []);

  const fetchQueue = async () => {
    try {
      setLoadingQueue(true);
      const res = await api.get('/claims?status=VERIFICATION_PENDING');
      setQueue(res.data.claims || []);
    } catch (err) {
      console.error('Failed to fetch verification queue:', err);
    } finally {
      setLoadingQueue(false);
    }
  };

  const fetchUsersDirectory = async () => {
    try {
      setLoadingDirectory(true);
      const res = await api.get('/verifiers/users-directory');
      setDirectory(res.data.directory || []);
    } catch (err) {
      console.error('Failed to fetch users directory:', err);
    } finally {
      setLoadingDirectory(false);
    }
  };

  const handleApprove = async (claim) => {
    if (isPendingApproval) {
      alert('Your verifier account is awaiting Admin approval. You cannot attest claims yet.');
      return;
    }

    try {
      setProcessingClaimId(claim._id);
      setTxModal({
        isOpen: true,
        status: 'signing',
        title: 'Approve & Verify Claim',
        message: 'Please confirm the verifyClaim transaction in MetaMask...',
        txHash: '',
        error: '',
      });

      let onChainId = claim.onChainClaimId;
      if (!onChainId) {
        const hash = claim.evidenceHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
        const mintResult = await createOnChainClaim(claim.type, hash);
        onChainId = mintResult.claimId;
      }

      const { tx } = await verifyOnChainClaim(onChainId);

      setTxModal({
        isOpen: true,
        status: 'mining',
        title: 'Mining Verification Proof',
        message: 'Submitting verification proof to TrustMesh smart contract...',
        txHash: tx.hash,
        error: '',
      });

      await tx.wait();

      await api.post(`/verification/${claim._id}/verify`, {
        approved: true,
        comments: 'Verified by authorized protocol verifier.',
        transactionHash: tx.hash,
      });

      // Optimistically remove claim from local queue
      setQueue((prev) => prev.filter((item) => item._id !== claim._id));

      setTxModal({
        isOpen: true,
        status: 'success',
        title: 'Verification Confirmed!',
        message: 'Claim has been cryptographically sealed on the Ethereum blockchain.',
        txHash: tx.hash,
        error: '',
      });

      fetchQueue();
      fetchUsersDirectory();
    } catch (err) {
      console.error('Approve failed:', err);
      setTxModal({
        isOpen: true,
        status: 'error',
        title: 'Verification Failed',
        message: err.reason || err.message || 'MetaMask transaction was rejected.',
        txHash: '',
        error: err.message,
      });
    } finally {
      setProcessingClaimId(null);
    }
  };

  const handleOpenReject = (claim) => {
    if (isPendingApproval) {
      alert('Your verifier account is awaiting Admin approval.');
      return;
    }
    setRejectModal({ isOpen: true, claim, reason: '' });
  };

  const handleConfirmReject = async () => {
    const { claim, reason } = rejectModal;
    if (!claim || !reason.trim()) {
      alert('Please specify a rejection reason.');
      return;
    }

    try {
      setProcessingClaimId(claim._id);
      setRejectModal({ isOpen: false, claim: null, reason: '' });

      setTxModal({
        isOpen: true,
        status: 'signing',
        title: 'Reject Claim Verification',
        message: 'Please confirm rejectClaim transaction in MetaMask...',
        txHash: '',
        error: '',
      });

      let onChainId = claim.onChainClaimId;
      if (!onChainId) {
        const hash = claim.evidenceHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
        const mintResult = await createOnChainClaim(claim.type, hash);
        onChainId = mintResult.claimId;
      }

      const { tx } = await rejectOnChainClaim(onChainId, reason.trim());

      setTxModal({
        isOpen: true,
        status: 'mining',
        title: 'Mining Rejection Record',
        message: 'Recording claim rejection on the TrustMesh contract...',
        txHash: tx.hash,
        error: '',
      });

      await tx.wait();

      await api.post(`/verification/${claim._id}/reject`, {
        approved: false,
        reason: reason.trim(),
        transactionHash: tx.hash,
      });

      // Optimistically remove rejected claim from local queue
      setQueue((prev) => prev.filter((item) => item._id !== claim._id));

      setTxModal({
        isOpen: true,
        status: 'success',
        title: 'Rejection Recorded',
        message: 'Rejection reason immutably logged on-chain.',
        txHash: tx.hash,
        error: '',
      });

      fetchQueue();
    } catch (err) {
      console.error('Rejection failed:', err);
      setTxModal({
        isOpen: true,
        status: 'error',
        title: 'Rejection Failed',
        message: err.reason || err.message || 'Transaction rejected.',
        txHash: '',
        error: err.message,
      });
    } finally {
      setProcessingClaimId(null);
    }
  };

  const handleSuspendUser = async () => {
    const { user: targetUser, reason } = suspendModal;
    if (!targetUser || !reason.trim()) {
      alert('Please provide a reason for flagging/suspending this user.');
      return;
    }

    try {
      await api.post(`/verifiers/users/${targetUser.walletAddress}/suspend`, { reason: reason.trim() });
      setSuspendModal({ isOpen: false, user: null, reason: '' });
      alert(`User ${targetUser.walletAddress} has been flagged and suspended.`);
      fetchUsersDirectory();
    } catch (err) {
      console.error('Failed to suspend user:', err);
      alert('Failed to suspend user.');
    }
  };

  const handleReinstateUser = async (targetUser) => {
    if (!window.confirm(`Reinstate user ${targetUser.walletAddress}?`)) return;
    try {
      await api.post(`/verifiers/users/${targetUser.walletAddress}/reinstate`);
      alert('User reinstated successfully.');
      fetchUsersDirectory();
    } catch (err) {
      console.error('Failed to reinstate user:', err);
      alert('Failed to reinstate user.');
    }
  };

  const filteredDirectory = directory.filter((item) => {
    const q = searchQuery.toLowerCase();
    const u = item.user || {};
    const p = item.profile || {};
    return (
      u.name?.toLowerCase().includes(q) ||
      u.walletAddress?.toLowerCase().includes(q) ||
      p.headline?.toLowerCase().includes(q) ||
      p.skills?.some((s) => s.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-6xl mx-auto pb-16">
      {/* Pending Approval Warning */}
      {isPendingApproval && (
        <div className="mb-8 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3 text-amber-300">
          <span className="text-2xl">⏳</span>
          <div className="text-xs">
            <h4 className="font-bold text-sm text-white mb-0.5">Verifier Application Pending Admin Approval</h4>
            <p className="text-amber-300/80 leading-relaxed">
              Your profile is registered as an aspiring Verifier. The Protocol Administrator must authorize your account before you can verify on-chain claims. You can still browse user profiles and attached documents below.
            </p>
          </div>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-tm-teal text-xs font-mono mb-2">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span>Authorized Verifier Console</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Verifier Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            Audit candidates, inspect attached profile evidence documents, and attest credentials on-chain.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-2xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'queue'
                ? 'bg-tm-blue text-white shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>⚡ Verification Queue</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-950/60 text-[10px] font-mono">
              {queue.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-tm-blue text-white shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>👥 Talent &amp; Documents</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-950/60 text-[10px] font-mono">
              {directory.length}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: CLAIMS VERIFICATION QUEUE */}
      {activeTab === 'queue' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Pending Claims for Review</span>
              <span className="text-xs font-mono text-slate-400">({queue.length})</span>
            </h2>
            <button
              onClick={fetchQueue}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              🔄 Refresh Queue
            </button>
          </div>

          {loadingQueue ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-3 border-tm-blue border-t-transparent rounded-full animate-spin" />
            </div>
          ) : queue.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center shadow-xl">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center text-2xl">
                ✨
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Queue is Clear</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                No claims are currently awaiting verifier inspection. Switch to the Talent &amp; Documents tab to inspect user profiles.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {queue.map((claim) => (
                <VerifierQueueRow
                  key={claim._id}
                  claim={claim}
                  onApprove={handleApprove}
                  onReject={handleOpenReject}
                  isProcessing={processingClaimId === claim._id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TALENT & PROFILES DIRECTORY */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidates by name, wallet address, skills..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-teal-500 text-white text-xs focus:outline-none"
              />
              <span className="absolute left-3 top-2.5 text-slate-500 text-xs">🔍</span>
            </div>
            <button
              onClick={fetchUsersDirectory}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors self-start sm:self-auto"
            >
              🔄 Refresh Directory
            </button>
          </div>

          {loadingDirectory ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-3 border-tm-teal border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredDirectory.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
              No registered candidates match your search criteria.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDirectory.map((item) => {
                const u = item.user || {};
                const p = item.profile || {};
                const docs = p.profileDocuments || [];
                const isExpanded = expandedUser === u._id;

                return (
                  <div
                    key={u._id}
                    className={`bg-slate-900 border rounded-2xl p-6 shadow-xl transition-all ${
                      u.isSuspended ? 'border-rose-900/60 bg-rose-950/10' : 'border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-base font-bold text-white">{u.name || 'Anonymous Candidate'}</h3>
                          {u.isSuspended ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              ⚠️ SUSPENDED / FLAGGED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Active
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                            Score: {typeof item.trustScore === 'object' ? (item.trustScore?.score ?? 0) : (item.trustScore ?? 0)}/100
                          </span>
                        </div>

                        {p.headline && <p className="text-xs text-slate-300 mt-1">{p.headline}</p>}

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-2 font-mono">
                          <span>👛 {u.walletAddress}</span>
                          {u.email && <span>✉️ {u.email}</span>}
                          <span>📁 {docs.length} Attached Doc{docs.length === 1 ? '' : 's'}</span>
                          <span>📜 {item.claimsCount} Claims ({item.verifiedCount} Verified)</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setExpandedUser(isExpanded ? null : u._id)}
                          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 font-semibold text-xs border border-slate-700 transition-all flex items-center gap-1.5"
                        >
                          <span>{isExpanded ? '▲ Hide Details' : '▼ Inspect Profile & Docs'}</span>
                        </button>

                        {u.isSuspended ? (
                          <button
                            type="button"
                            onClick={() => handleReinstateUser(u)}
                            className="px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold"
                          >
                            Reinstate
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSuspendModal({ isOpen: true, user: u, reason: '' })}
                            className="px-3 py-2 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1"
                          >
                            <span>🚩 Flag / Revoke</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Suspension reason notification */}
                    {u.isSuspended && (
                      <div className="mt-4 p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs">
                        <strong>Suspension Reason:</strong> {u.suspensionReason} •{' '}
                        <span className="font-mono text-[11px] text-slate-400">
                          Flagged by {u.suspendedBy?.slice(0, 8)}...
                        </span>
                      </div>
                    )}

                    {/* Expanded Drawer: Full Profile and Attached Documents */}
                    {isExpanded && (
                      <div className="mt-6 pt-6 border-t border-slate-800 space-y-5 animate-fadeIn">
                        {p.bio && (
                          <div>
                            <h4 className="text-xs font-bold uppercase text-slate-400 mb-1">Bio / Summary</h4>
                            <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
                              {p.bio}
                            </p>
                          </div>
                        )}

                        {/* Skills */}
                        {p.skills && p.skills.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Claimed Skills</h4>
                            <div className="flex flex-wrap gap-1.5">
                              {p.skills.map((s, i) => (
                                <span
                                  key={i}
                                  className="px-2.5 py-1 rounded-lg bg-slate-950 text-slate-300 border border-slate-800 text-xs"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Attached Profile Documents Section */}
                        <div>
                          <h4 className="text-xs font-bold uppercase text-sky-400 mb-2 flex items-center gap-1.5">
                            <span>📁 Attached Profile Documents ({docs.length})</span>
                          </h4>

                          {docs.length === 0 ? (
                            <p className="text-xs text-slate-500 italic">
                              Candidate has not attached any identity or degree documents yet.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {docs.map((doc) => (
                                <div
                                  key={doc._id}
                                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-2"
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-bold text-white text-xs truncate">{doc.title}</span>
                                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-500/10 text-sky-400 border border-blue-500/20 shrink-0">
                                        {doc.category}
                                      </span>
                                    </div>
                                    <div className="font-mono text-[10px] text-slate-400 truncate mt-1">
                                      SHA-256: {doc.fileHash}
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">
                                      {doc.fileName} • Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                                    </div>
                                  </div>

                                  <div className="pt-2 border-t border-slate-900 flex justify-between items-center">
                                    <a
                                      href={
                                        doc.documentUrl
                                          ? (doc.documentUrl.startsWith('http://localhost:5000')
                                              ? doc.documentUrl.replace('http://localhost:5000', '')
                                              : (doc.documentUrl.startsWith('http') || doc.documentUrl.startsWith('/')
                                                  ? doc.documentUrl
                                                  : `/${doc.documentUrl}`))
                                          : '#'
                                      }
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-sky-400 hover:text-sky-300 font-semibold text-xs flex items-center gap-1"
                                    >
                                      <span>👁️ Open / Audit Document</span>
                                    </a>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Flag / Suspend User Modal */}
      {suspendModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-white shadow-2xl relative">
            <h3 className="text-lg font-bold mb-1 text-rose-400">🚩 Flag &amp; Suspend User</h3>
            <p className="text-xs text-slate-400 mb-4">
              Suspending candidate <code className="text-white">{suspendModal.user?.walletAddress}</code> blocks them from submitting new claims and marks their profile as unverified.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Mandatory Reason / Audit Finding *
              </label>
              <textarea
                rows={3}
                placeholder="e.g., Fabricated academic transcript detected / Duplicate identity document..."
                value={suspendModal.reason}
                onChange={(e) => setSuspendModal({ ...suspendModal, reason: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl p-3 text-white text-xs focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSuspendModal({ isOpen: false, user: null, reason: '' })}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSuspendUser}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30"
              >
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Claim Modal */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-white shadow-2xl relative">
            <h3 className="text-lg font-bold mb-2">Reject Claim Verification</h3>
            <p className="text-xs text-slate-400 mb-4">
              Provide a clear reason for the rejection. This rationale will be permanently recorded in the audit trail.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-mono uppercase text-slate-400 mb-2">
                Rejection Reason
              </label>
              <textarea
                rows={3}
                value={rejectModal.reason}
                onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl p-3 text-white text-xs focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRejectModal({ isOpen: false, claim: null, reason: '' })}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MetaMask Transaction Status Modal */}
      <TxStatusModal
        isOpen={txModal.isOpen}
        status={txModal.status}
        title={txModal.title}
        message={txModal.message}
        txHash={txModal.txHash}
        error={txModal.error}
        onClose={() => setTxModal({ ...txModal, isOpen: false })}
      />
    </div>
  );
}
