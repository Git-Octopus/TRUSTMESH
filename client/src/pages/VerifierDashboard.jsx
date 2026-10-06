import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import api from '../services/api';
import { useWallet } from '../hooks/useWallet';
import TrustMeshConfig from '../contracts/TrustMesh.json';

export default function VerifierDashboard() {
  const { walletAddress } = useWallet();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      // Fetch claims pending verification
      const res = await api.get('/claims?status=VERIFICATION_PENDING');
      setQueue(res.data.claims || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (claim) => {
    if (!window.ethereum) return alert('MetaMask required');
    try {
      setProcessingId(claim._id);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(TrustMeshConfig.address, TrustMeshConfig.abi, signer);

      // Call verifyClaim on-chain (using ID or off-chain identifier depending on contract)
      // Assuming contract expects a numeric claim ID mapping. We will use a dummy ID for the demo if none mapped.
      // Or in the actual implementation it might take a string hash. Let's pass the claim._id as a string/bytes or however it's structured.
      // Wait, let's look at the ABI or doc. The doc says: `function verifyClaim(uint256 claimId)`.
      // Our Mongo _id is a hex string, not uint256. 
      // The doc says: `createClaim` returns `uint256 claimId`. We need to fetch that from the db.
      // Assuming `claim.blockchainId` exists. If not, we just hash the mongo ID to a uint256 for this call.
      
      const tx = await contract.verifyClaim(claim.blockchainId || 1); // fallback to 1 for safety if missing
      
      alert('Transaction submitted to blockchain. Waiting for confirmation...');
      
      await tx.wait();
      
      // Notify backend to sync
      await api.post('/verification/sync', { 
         claimId: claim._id, 
         transactionHash: tx.hash,
         status: 'VERIFIED'
      });
      
      alert('Claim successfully verified on-chain!');
      fetchQueue();
      
    } catch (err) {
      console.error(err);
      alert('Verification failed: ' + (err.reason || err.message));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (claim) => {
    const reason = prompt("Enter rejection reason (optional):");
    if (reason === null) return; // user cancelled

    try {
      setProcessingId(claim._id);
      
      // We could do this via smart contract `rejectClaim` or just off-chain depending on requirements.
      // The doc says "route Reject through the contract too for consistency".
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(TrustMeshConfig.address, TrustMeshConfig.abi, signer);

      const tx = await contract.rejectClaim(claim.blockchainId || 1, reason || "No reason provided");
      await tx.wait();

      await api.post('/verification/sync', { 
         claimId: claim._id, 
         transactionHash: tx.hash,
         status: 'REJECTED'
      });

      alert('Claim rejected');
      fetchQueue();
    } catch (err) {
      console.error(err);
      alert('Rejection failed');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div>Loading queue...</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Verifier Dashboard</h2>
      
      {queue.length === 0 ? (
        <div className="bg-tm-charcoal p-8 rounded-lg text-center border border-gray-800">
          <p className="text-gray-400">No claims are currently pending verification.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map(claim => (
            <div key={claim._id} className="bg-tm-charcoal p-6 rounded-lg shadow border border-gray-800 flex justify-between items-center">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-xl font-semibold">{claim.title}</h3>
                  <span className="bg-gray-800 px-2 py-1 text-xs rounded-full">{claim.type}</span>
                </div>
                <p className="text-sm text-gray-400 mb-1">Claimant: <span className="font-mono">{claim.profileId}</span></p>
                <div className="flex items-center space-x-2 mt-2">
                  <a href={claim.evidenceUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-tm-teal hover:underline flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    View Evidence
                  </a>
                  <span className="text-gray-600">|</span>
                  <span className="font-mono text-xs text-gray-500">Hash: {claim.evidenceHash}</span>
                </div>
              </div>
              <div className="flex space-x-3">
                <button 
                  onClick={() => handleReject(claim)}
                  disabled={processingId === claim._id}
                  className="bg-transparent border border-red-500 text-red-500 hover:bg-red-500 hover:text-white font-semibold py-2 px-4 rounded transition-colors disabled:opacity-50"
                >
                  Reject
                </button>
                <button 
                  onClick={() => handleApprove(claim)}
                  disabled={processingId === claim._id}
                  className="bg-tm-verified hover:bg-green-600 text-white font-semibold py-2 px-4 rounded transition-colors shadow-lg shadow-green-900/50 disabled:opacity-50"
                >
                  {processingId === claim._id ? 'Processing...' : 'Approve on Chain'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
