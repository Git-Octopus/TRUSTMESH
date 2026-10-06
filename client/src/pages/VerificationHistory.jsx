import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

export default function VerificationHistory() {
  const { claimId } = useParams();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [claimId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/verification/history/${claimId}`);
      setHistory(res.data.history || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center p-8">Loading history...</div>;
  if (history.length === 0) return <div className="text-center p-8 text-gray-400">No verification history found for this claim.</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Verification History</h2>
      
      <div className="bg-tm-charcoal p-6 rounded-lg border border-gray-800 shadow-xl relative">
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-700"></div>
        <div className="space-y-8 relative">
          {history.map((event, index) => (
            <div key={index} className="flex gap-4">
              <div className="w-4 h-4 mt-1 rounded-full bg-tm-blue relative z-10 shrink-0"></div>
              <div className="flex-1 bg-slate-900 p-4 rounded border border-gray-700">
                <div className="flex justify-between items-start mb-2">
                  <span className={`px-2 py-1 text-xs rounded-full font-semibold ${event.status === 'VERIFIED' ? 'bg-tm-verified text-white' : event.status === 'REJECTED' || event.status === 'REVOKED' ? 'bg-tm-rejected text-white' : 'bg-gray-700 text-gray-300'}`}>
                    {event.status}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(event.createdAt || event.blockchainTimestamp * 1000).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-300 mb-2">{event.comments}</p>
                {event.verifierWallet && (
                  <p className="text-xs text-gray-500 font-mono">Actor: {event.verifierWallet}</p>
                )}
                {event.transactionHash && (
                  <p className="text-xs text-tm-teal font-mono mt-1">Tx: {event.transactionHash}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
