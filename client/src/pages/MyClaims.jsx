import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useWallet } from '../hooks/useWallet';
import StatusBadge from '../components/StatusBadge';
import { formatHash } from '../utils/formatHash';

export default function MyClaims() {
  const { walletAddress } = useWallet();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    if (walletAddress) {
      fetchClaims();
    }
  }, [walletAddress]);

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const res = await api.get('/claims');
      setClaims(res.data.claims || []);
    } catch (err) {
      console.error('Failed to load user claims:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter & Sort
  const filteredClaims = claims.filter((c) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'VERIFIED') return c.status === 'VERIFIED';
    if (statusFilter === 'PENDING')
      return ['PENDING', 'VERIFICATION_PENDING', 'EVIDENCE_CHECK', 'SUBMITTED'].includes(c.status);
    if (statusFilter === 'REJECTED') return ['REJECTED', 'REVOKED'].includes(c.status);
    if (statusFilter === 'DRAFT') return c.status === 'DRAFT';
    return true;
  });

  const sortedClaims = [...filteredClaims].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    return 0;
  });

  return (
    <div className="max-w-5xl mx-auto pb-16">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">My Credentials & Claims</h1>
          <p className="text-sm text-slate-400 mt-1">
            Track status, attach evidence, and request cryptographic verification.
          </p>
        </div>

        <Link
          to="/claims/new"
          className="px-5 py-2.5 rounded-xl bg-tm-blue hover:bg-blue-600 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-500/20 inline-flex items-center gap-2 self-start sm:self-auto"
        >
          <span>+</span> Create New Claim
        </Link>
      </div>

      {/* Filter Tabs & Sort Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filters */}
        <div className="flex flex-wrap gap-2">
          {['ALL', 'VERIFIED', 'PENDING', 'DRAFT', 'REJECTED'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                statusFilter === tab
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="title">Alphabetical (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Table / List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-3 border-tm-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sortedClaims.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center shadow-xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center text-2xl">
            📜
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Claims Found</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
            {statusFilter === 'ALL'
              ? 'You haven’t established any claims yet. Begin constructing your on-chain credential portfolio.'
              : `No claims currently match the "${statusFilter}" filter.`}
          </p>
          <Link
            to="/claims/new"
            className="px-6 py-2.5 rounded-xl bg-tm-blue hover:bg-blue-600 text-white font-semibold text-sm transition-all inline-block shadow-lg shadow-blue-500/20"
          >
            Create Your First Claim →
          </Link>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                <th className="px-6 py-3.5">Category</th>
                <th className="px-6 py-3.5">Title & Organization</th>
                <th className="px-6 py-3.5">Evidence Fingerprint</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {sortedClaims.map((claim) => (
                <tr key={claim._id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                      {claim.type}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <h4 className="font-bold text-white text-sm">{claim.title}</h4>
                    {claim.organization && (
                      <p className="text-xs text-slate-400">at {claim.organization}</p>
                    )}
                  </td>

                  <td className="px-6 py-4 font-mono text-xs text-slate-400">
                    {claim.evidenceHash ? (
                      <span className="text-tm-teal" title={claim.evidenceHash}>
                        {formatHash(claim.evidenceHash)}
                      </span>
                    ) : (
                      <span className="text-slate-600 italic">None</span>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <StatusBadge status={claim.status} size="sm" />
                  </td>

                  <td className="px-6 py-4 text-xs text-slate-400">
                    {new Date(claim.createdAt).toLocaleDateString()}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/claim/${claim._id}`}
                      className="text-xs font-semibold text-tm-teal hover:text-white transition-colors"
                    >
                      View Details →
                    </Link>
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
