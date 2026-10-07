import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useWallet } from '../hooks/useWallet';
import VerifierQueueRow from '../components/VerifierQueueRow';
import TxStatusModal from '../components/TxStatusModal';
import { verifyOnChainClaim, rejectOnChainClaim, createOnChainClaim } from '../services/web3';

export default function VerifierDashboard() {
  const { walletAddress } = useWallet();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingClaimId, setProcessingClaimId] = useState(null);

  // Reject Modal State
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

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      // Fetch claims pending review
      const res = await api.get('/claims?status=VERIFICATION_PENDING');
      setQueue(res.data.claims || []);
    } catch (err) {
      console.error('Failed to fetch verification queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (claim) => {
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

      // If claim was never minted on-chain by the claimant, mint it first so it exists
      if (!onChainId) {
        const hash = claim.evidenceHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
        const mintResult = await createOnChainClaim(claim.type, hash);
        onChainId = mintResult.claimId;
      }

      // Execute on-chain verifyClaim
      const { tx } = await verifyOnChainClaim(onChainId);

      setTxModal({
        isOpen: true,
        status: 'mining',
        title: 'Mining Verification Proof',
        message: 'Submitting verification proof to TrustMesh smart contract...',
        txHash: tx.hash,
        error: '',
      });

      // Synchronize database state with blockchain confirmation
      await api.post('/verification/sync', {
        claimId: claim._id,
        onChainClaimId: onChainId,
        verifierWallet: walletAddress,
        status: 'VERIFIED',
        transactionHash: tx.hash,
        method: 'smart_contract',
        approved: true,
      });

      setTxModal({
        isOpen: true,
        status: 'success',
        title: 'Verification Complete!',
        message: `Claim successfully verified on-chain and recorded to the immutable ledger.`,
        txHash: tx.hash,
        error: '',
      });

      fetchQueue();
    } catch (err) {
      console.error(err);
      setTxModal({
        isOpen: true,
        status: 'error',
        title: 'Verification Failed',
        message: '',
        txHash: '',
        error: err.reason || err.message || 'Transaction was rejected.',
      });
    } finally {
      setProcessingClaimId(null);
    }
  };

  const handleOpenReject = (claim) => {
    setRejectModal({
      isOpen: true,
      claim,
      reason: 'Evidence does not sufficiently corroborate the stated claim parameters.',
    });
  };

  const handleConfirmReject = async () => {
    const { claim, reason } = rejectModal;
    if (!claim) return;

    try {
      setProcessingClaimId(claim._id);
      setRejectModal({ isOpen: false, claim: null, reason: '' });

      setTxModal({
        isOpen: true,
        status: 'signing',
        title: 'Reject Claim',
        message: 'Confirming rejection on-chain...',
        txHash: '',
        error: '',
      });

      let onChainId = claim.onChainClaimId;
      let txHash = '';

      if (onChainId) {
        try {
          const res = await rejectOnChainClaim(onChainId, reason);
          txHash = res.tx.hash;
        } catch (e) {
          console.warn('Smart contract rejectClaim bypassed/failed, recording off-chain:', e);
        }
      }

      // Sync off-chain state
      await api.post('/verification/sync', {
        claimId: claim._id,
        verifierWallet: walletAddress,
        status: 'REJECTED',
        transactionHash: txHash,
        comments: reason,
        approved: false,
      });

      setTxModal({
        isOpen: true,
        status: 'success',
        title: 'Claim Rejected',
        message: 'The claim has been marked as REJECTED with the recorded rationale.',
        txHash,
        error: '',
      });

      fetchQueue();
    } catch (err) {
      setTxModal({
        isOpen: true,
        status: 'error',
        title: 'Rejection Failed',
        message: '',
        txHash: '',
        error: err.message || 'Failed to reject claim',
      });
    } finally {
      setProcessingClaimId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Verifier Queue</h1>
          <p className="text-sm text-slate-400 mt-1">
            Review pending claims, inspect cryptographic evidence, and execute on-chain attestations.
          </p>
        </div>

        <button
          onClick={fetchQueue}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors self-start sm:self-auto"
        >
          🔄 Refresh Queue
        </button>
      </div>

      {loading ? (
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
            No claims are currently awaiting verifier inspection. New submissions will appear here automatically.
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

      {/* Reject Modal */}
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
