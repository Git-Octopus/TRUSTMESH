import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import Timeline from '../components/Timeline';

export default function VerificationHistory() {
  const { claimId } = useParams();
  const [history, setHistory] = useState([]);
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistoryData();
  }, [claimId]);

  const fetchHistoryData = async () => {
    try {
      setLoading(true);

      // Fetch history events
      const res = await api.get(claimId ? `/verification/history/${claimId}` : '/verification/history');
      setHistory(res.data.history || []);

      // If specific claim ID, fetch claim details too
      if (claimId) {
        try {
          const claimRes = await api.get(`/claims/${claimId}`);
          setClaim(claimRes.data.claim);
        } catch (e) {
          // Non-fatal
        }
      }
    } catch (err) {
      console.error('Failed to fetch verification audit trail:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-16">
      <div className="flex items-center justify-between mb-6">
        <Link
          to={claimId ? `/claim/${claimId}` : '/claims'}
          className="text-xs font-medium text-slate-400 hover:text-white"
        >
          ← Back to {claimId ? 'Claim Proof' : 'Claims'}
        </Link>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 mb-8 shadow-xl">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
          Verification History & Audit Trail
        </h1>
        <p className="text-sm text-slate-400">
          Chronological timeline of state transitions, evidence verifications, and cryptographic attestations.
        </p>

        {claim && (
          <div className="mt-4 pt-4 border-t border-slate-800 text-xs">
            <span className="text-slate-500 font-mono">Claim Subject: </span>
            <span className="text-white font-bold">{claim.title}</span>
            <span className="text-slate-400 font-mono ml-2">({claim.type})</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-3 border-tm-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          <Timeline events={history} />
        </div>
      )}
    </div>
  );
}
