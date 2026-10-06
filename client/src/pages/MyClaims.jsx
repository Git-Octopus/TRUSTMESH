import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useWallet } from '../hooks/useWallet';
import { Link } from 'react-router-dom';

export default function MyClaims() {
  const { walletAddress } = useWallet();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (walletAddress) {
      fetchClaims();
    }
  }, [walletAddress]);

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/claims?profileId=${walletAddress}`);
      setClaims(res.data.claims || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (status) => {
    switch(status) {
      case 'VERIFIED': return 'bg-tm-verified text-white';
      case 'PENDING':
      case 'VERIFICATION_PENDING':
      case 'EVIDENCE_CHECK':
      case 'SUBMITTED': return 'bg-tm-pending text-white';
      case 'REJECTED': 
      case 'REVOKED': return 'bg-tm-rejected text-white';
      default: return 'bg-tm-self text-white'; // DRAFT
    }
  };

  if (loading) return <div>Loading claims...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">My Claims</h2>
        <Link to="/claims/new" className="bg-tm-blue hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded">
          + New Claim
        </Link>
      </div>

      {claims.length === 0 ? (
        <div className="bg-tm-charcoal p-8 rounded-lg text-center border border-gray-800">
          <p className="text-gray-400 mb-4">You haven't created any claims yet.</p>
          <Link to="/claims/new" className="text-tm-teal hover:underline">Start building your trust profile</Link>
        </div>
      ) : (
        <div className="bg-tm-charcoal rounded-lg border border-gray-800 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-300">Type</th>
                <th className="px-6 py-3 font-medium text-gray-300">Title</th>
                <th className="px-6 py-3 font-medium text-gray-300">Status</th>
                <th className="px-6 py-3 font-medium text-gray-300">Date</th>
                <th className="px-6 py-3 font-medium text-gray-300">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {claims.map(claim => (
                <tr key={claim._id} className="hover:bg-gray-800/20 transition-colors">
                  <td className="px-6 py-4">{claim.type}</td>
                  <td className="px-6 py-4 font-medium">{claim.title}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full font-semibold ${statusColor(claim.status)}`}>
                      {claim.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    {new Date(claim.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <Link to={`/claim/${claim._id}`} className="text-tm-teal hover:underline">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
