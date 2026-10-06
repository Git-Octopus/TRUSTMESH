import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

export default function ClaimDetails() {
  const { id } = useParams();
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchClaim();
  }, [id]);

  const fetchClaim = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/claims/${id}`);
      setClaim(res.data.claim);
    } catch (err) {
      setError('Failed to load claim details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center p-8">Loading claim...</div>;
  if (error || !claim) return <div className="text-center p-8 text-red-400">{error || 'Claim not found'}</div>;

  const isVerified = claim.status === 'VERIFIED';
  const verification = claim.verification || {};

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">{claim.title}</h1>
          <div className="flex items-center space-x-3 text-sm">
            <span className="bg-gray-800 px-3 py-1 rounded-full text-gray-300">{claim.type}</span>
            <span className={`px-3 py-1 rounded-full font-bold ${isVerified ? 'bg-tm-verified' : 'bg-tm-pending'} text-white`}>
              {claim.status.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Self-Claimed Off-Chain Data Panel */}
        <div className="bg-tm-charcoal rounded-lg border border-gray-700 shadow-xl overflow-hidden">
          <div className="bg-gray-800/50 p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-gray-300 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              Self-Claimed Data
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <p className="text-sm text-gray-500 font-medium">Claimant Profile</p>
              <p className="font-mono text-sm break-all">{claim.profileId}</p>
            </div>
            {claim.organization && (
              <div>
                <p className="text-sm text-gray-500 font-medium">Organization</p>
                <p className="text-lg">{claim.organization}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500 font-medium">Description</p>
              <p className="whitespace-pre-wrap">{claim.description}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium mb-1">Evidence Hash</p>
              <div className="bg-slate-900 p-3 rounded text-sm font-mono text-gray-300 break-all border border-gray-700">
                {claim.evidenceHash || 'No evidence uploaded'}
              </div>
            </div>
            {claim.evidenceUrl && (
              <a href={claim.evidenceUrl} target="_blank" rel="noopener noreferrer" className="text-tm-teal text-sm hover:underline inline-block mt-2">
                View Original Document →
              </a>
            )}
          </div>
        </div>

        {/* Blockchain Verification Panel */}
        <div className={`rounded-lg border shadow-xl overflow-hidden ${isVerified ? 'bg-[#0f2922] border-green-800' : 'bg-slate-900 border-gray-800'}`}>
          <div className={`p-4 border-b ${isVerified ? 'bg-green-900/30 border-green-800' : 'bg-gray-800/50 border-gray-800'}`}>
            <h2 className={`text-lg font-semibold flex items-center ${isVerified ? 'text-green-400' : 'text-gray-400'}`}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              Blockchain Proof
            </h2>
          </div>
          <div className="p-6">
            {isVerified ? (
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-green-500/80 font-medium mb-1">Verified By</p>
                  <p className="font-mono text-sm break-all text-gray-200">{verification.verifierWallet}</p>
                </div>
                <div>
                  <p className="text-sm text-green-500/80 font-medium mb-1">Timestamp</p>
                  <p className="text-gray-200">{new Date(verification.verifiedAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-green-500/80 font-medium mb-1">Transaction Hash</p>
                  <a 
                    href={`#tx-${verification.transactionHash}`} 
                    className="font-mono text-sm text-tm-teal hover:underline break-all block bg-slate-900/50 p-3 rounded border border-green-900/50"
                  >
                    {verification.transactionHash}
                  </a>
                </div>
                <div className="pt-4 mt-4 border-t border-green-900/30">
                  <p className="text-xs text-gray-400">
                    This claim has been cryptographically signed and stored immutably on the TrustMesh ledger.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p>Awaiting blockchain verification.</p>
                <p className="text-sm mt-2">Data resides off-chain until approved by an authorized verifier.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
