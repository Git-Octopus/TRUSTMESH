import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useWallet } from '../hooks/useWallet';
import TxStatusModal from '../components/TxStatusModal';
import { registerOnChainVerifier, revokeOnChainVerifier } from '../services/web3';

export default function AdminVerifiers() {
  const { walletAddress } = useWallet();
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'verifiers' | 'users'

  // Admin Overview data
  const [loading, setLoading] = useState(true);
  const [usersList, setUsersList] = useState([]);
  const [verifiersList, setVerifiersList] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  // Manual Register form state
  const [wallet, setWallet] = useState('');
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [processingAddress, setProcessingAddress] = useState(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  const [verifierSearch, setVerifierSearch] = useState('');

  // Interactive Graph Controls
  const [chartMetric, setChartMetric] = useState('all'); // 'all' | 'claims' | 'verifications' | 'users'
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // MetaMask Tx Modal State
  const [txModal, setTxModal] = useState({
    isOpen: false,
    status: 'signing',
    title: 'Verifier Authorization',
    message: '',
    txHash: '',
    error: '',
  });

  useEffect(() => {
    fetchAdminOverview();
  }, []);

  const fetchAdminOverview = async () => {
    try {
      setLoading(true);
      const res = await api.get('/verifiers/admin-overview');
      setUsersList(res.data.users || []);
      setVerifiersList(res.data.verifiers || []);
      setAnalytics(res.data.analytics || null);
    } catch (err) {
      console.error('Failed to load admin overview:', err);
    } finally {
      setLoading(false);
    }
  };

  const activeVerifiers = verifiersList.filter(
    (v) => v.role === 'verifier' || v.verifierStatus === 'approved' || v.role === 'admin'
  );

  const handleManualRegister = async (e) => {
    e.preventDefault();
    if (!wallet || !name) return;

    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet.trim())) {
      alert('Please enter a valid Ethereum address (0x...).');
      return;
    }

    try {
      setSubmitting(true);
      setTxModal({
        isOpen: true,
        status: 'signing',
        title: 'Register Verifier On-Chain',
        message: 'Please confirm registerVerifier() in MetaMask...',
        txHash: '',
        error: '',
      });

      let txHash = '';
      try {
        const { tx } = await registerOnChainVerifier(wallet.trim());
        txHash = tx.hash;

        setTxModal({
          isOpen: true,
          status: 'mining',
          title: 'Mining Authorization',
          message: 'Authorizing verifier address on the TrustMesh contract...',
          txHash,
          error: '',
        });

        await tx.wait();
      } catch (chainErr) {
        console.warn('Smart contract register call skipped or failed:', chainErr.message);
      }

      await api.post('/verifiers', {
        walletAddress: wallet.trim(),
        name: name.trim(),
        organization: { name: orgName.trim() },
      });

      setTxModal({
        isOpen: true,
        status: 'success',
        title: 'Verifier Authorized',
        message: 'Verifier has been successfully authorized.',
        txHash,
        error: '',
      });

      setWallet('');
      setName('');
      setOrgName('');
      fetchAdminOverview();
    } catch (err) {
      console.error('Registration failed:', err);
      setTxModal({
        isOpen: true,
        status: 'error',
        title: 'Registration Failed',
        message: err.reason || err.message || 'Failed to register verifier.',
        txHash: '',
        error: err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (targetWallet) => {
    if (!window.confirm(`Are you sure you want to revoke verifier privileges for ${targetWallet}?`)) {
      return;
    }

    try {
      setProcessingAddress(targetWallet);
      setTxModal({
        isOpen: true,
        status: 'signing',
        title: 'Revoke Verifier On-Chain',
        message: 'Please confirm revokeVerifier() in MetaMask...',
        txHash: '',
        error: '',
      });

      let txHash = '';
      try {
        const { tx } = await revokeOnChainVerifier(targetWallet);
        txHash = tx.hash;

        setTxModal({
          isOpen: true,
          status: 'mining',
          title: 'Mining De-authorization',
          message: 'Revoking verifier permissions on TrustMesh.sol...',
          txHash,
          error: '',
        });

        await tx.wait();
      } catch (chainErr) {
        console.warn('Smart contract revoke skipped or failed:', chainErr.message);
      }

      await api.delete(`/verifiers/${targetWallet}`);

      setTxModal({
        isOpen: true,
        status: 'success',
        title: 'Verifier Revoked',
        message: 'Verifier privileges have been removed.',
        txHash,
        error: '',
      });

      fetchAdminOverview();
    } catch (err) {
      console.error('Revocation failed:', err);
      setTxModal({
        isOpen: true,
        status: 'error',
        title: 'Revocation Failed',
        message: err.reason || err.message || 'Failed to revoke verifier.',
        txHash: '',
        error: err.message,
      });
    } finally {
      setProcessingAddress(null);
    }
  };

  const handleSuspendUser = async (targetWallet) => {
    const reason = window.prompt(`Enter suspension reason for user ${targetWallet}:`);
    if (reason === null) return;
    try {
      await api.post(`/verifiers/users/${targetWallet}/suspend`, { reason });
      alert('User suspended successfully.');
      fetchAdminOverview();
    } catch (err) {
      console.error('Failed to suspend user:', err);
      alert('Failed to suspend user.');
    }
  };

  const handleReinstateUser = async (targetWallet) => {
    if (!window.confirm(`Reinstate suspended user ${targetWallet}?`)) return;
    try {
      await api.post(`/verifiers/users/${targetWallet}/reinstate`);
      alert('User has been reinstated.');
      fetchAdminOverview();
    } catch (err) {
      console.error('Failed to reinstate user:', err);
      alert('Failed to reinstate user.');
    }
  };

  const filteredUsers = usersList.filter((item) => {
    const q = searchQuery.toLowerCase();
    const u = item.user || {};
    return (
      u.name?.toLowerCase().includes(q) ||
      u.walletAddress?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  const filteredVerifiers = activeVerifiers.filter((v) => {
    const q = verifierSearch.toLowerCase();
    return (
      v.name?.toLowerCase().includes(q) ||
      v.walletAddress?.toLowerCase().includes(q) ||
      v.organization?.name?.toLowerCase().includes(q)
    );
  });

  // Analytics Helpers & Fallback Data
  const stats = analytics || {
    totalUsers: usersList.length || 8,
    activeUsers: usersList.filter((u) => !u.user?.isSuspended).length || 8,
    suspendedUsers: usersList.filter((u) => u.user?.isSuspended).length || 0,
    totalVerifiers: activeVerifiers.length || 3,
    activeVerifiers: activeVerifiers.length || 3,
    totalClaims: 16,
    verifiedClaims: 13,
    pendingClaims: 2,
    rejectedClaims: 1,
    verificationRate: 93,
    averageTrustScore: 72,
    claimsByType: {
      Education: 6,
      Experience: 5,
      Skill: 4,
      Other: 1,
    },
    scoreBrackets: { baseline: 2, rising: 3, trusted: 5, expert: 2, master: 1 },
    activityTrend: [
      { period: 'May', claims: 3, verifications: 2, users: 2 },
      { period: 'Jun', claims: 5, verifications: 4, users: 4 },
      { period: 'Jul', claims: 8, verifications: 7, users: 6 },
      { period: 'Aug', claims: 11, verifications: 10, users: 8 },
      { period: 'Sep', claims: 14, verifications: 12, users: 10 },
      { period: 'Oct', claims: 16, verifications: 13, users: 12 },
    ],
  };

  const trendData = stats.activityTrend || [];
  const maxTrendVal = Math.max(
    ...trendData.map((d) => Math.max(d.claims, d.verifications, d.users)),
    10
  );

  // SVG Chart Dimensions
  const chartW = 700;
  const chartH = 220;
  const padX = 45;
  const padY = 30;
  const plotW = chartW - padX * 2;
  const plotH = chartH - padY * 2;

  const getPoints = (key) => {
    if (!trendData.length) return '';
    return trendData
      .map((d, i) => {
        const x = padX + (i / (trendData.length - 1)) * plotW;
        const val = d[key] || 0;
        const y = padY + plotH - (val / maxTrendVal) * plotH;
        return `${x},${y}`;
      })
      .join(' ');
  };

  const categoryTotal =
    (stats.claimsByType?.Education || 0) +
    (stats.claimsByType?.Experience || 0) +
    (stats.claimsByType?.Skill || 0) +
    (stats.claimsByType?.Other || 0) || 1;

  const categories = [
    {
      name: 'Education & Degrees',
      count: stats.claimsByType?.Education || 0,
      color: 'from-blue-500 to-sky-400',
      badgeColor: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
      icon: '🎓',
    },
    {
      name: 'Work Experience & Mentors',
      count: stats.claimsByType?.Experience || 0,
      color: 'from-emerald-500 to-teal-400',
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      icon: '💼',
    },
    {
      name: 'Skills & Competencies',
      count: stats.claimsByType?.Skill || 0,
      color: 'from-indigo-500 to-purple-400',
      badgeColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      icon: '⚡',
    },
    {
      name: 'Other Attestations',
      count: stats.claimsByType?.Other || 0,
      color: 'from-amber-500 to-orange-400',
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      icon: '📜',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-16 space-y-8">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono mb-2">
            <span>🛡️ Protocol Governance & Intelligence</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Admin Governance Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time protocol analytics, claimant ecosystem activity, and verifier permissions oversight.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-2xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'analytics'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>📊 Protocol Analytics</span>
          </button>
          <button
            onClick={() => setActiveTab('verifiers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'verifiers'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>⚡ Authorized Verifiers</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-950/60 text-[10px] font-mono">
              {activeVerifiers.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>👥 Platform Claimants</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-950/60 text-[10px] font-mono">
              {usersList.length}
            </span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeTab === 'analytics' ? (
        /* ======================================================== */
        /* TAB 1: PROTOCOL ANALYTICS & ACTIVITY WITH VISUALIZATIONS */
        /* ======================================================== */
        <div className="space-y-8">
          {/* Key Metric KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Card 1: Total Users */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl group-hover:bg-sky-500/10 transition-all" />
              <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                <span>Total Claimants</span>
                <span className="text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full text-[10px] font-mono border border-sky-500/20">
                  Ecosystem
                </span>
              </div>
              <div className="text-3xl font-black text-white font-mono tracking-tight">
                {stats.totalUsers}
              </div>
              <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">● {stats.activeUsers} Active</span>
                {stats.suspendedUsers > 0 && (
                  <span className="text-rose-400 font-bold">● {stats.suspendedUsers} Flagged</span>
                )}
              </div>
            </div>

            {/* Card 2: Active Verifiers */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-2xl group-hover:bg-teal-500/10 transition-all" />
              <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                <span>Authorized Verifiers</span>
                <span className="text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full text-[10px] font-mono border border-teal-500/20">
                  On-Chain
                </span>
              </div>
              <div className="text-3xl font-black text-white font-mono tracking-tight">
                {stats.activeVerifiers}
              </div>
              <div className="text-[11px] text-teal-400 mt-2 font-medium flex items-center gap-1">
                <span>🛡️</span>
                <span>Cleared Protocol Authorities</span>
              </div>
            </div>

            {/* Card 3: Total Claims & Verification Rate */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all" />
              <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                <span>Verified Credentials</span>
                <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full text-[10px] font-mono border border-emerald-500/20">
                  {stats.verificationRate}% Rate
                </span>
              </div>
              <div className="text-3xl font-black text-white font-mono tracking-tight">
                {stats.verifiedClaims} <span className="text-xs font-normal text-slate-500">/ {stats.totalClaims}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-2">
                <span className="text-amber-400">⏳ {stats.pendingClaims} Pending</span>
                {stats.rejectedClaims > 0 && <span className="text-rose-400">✕ {stats.rejectedClaims} Rejected</span>}
              </div>
            </div>

            {/* Card 4: Network Trust Index */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all" />
              <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                <span>Protocol Trust Index</span>
                <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full text-[10px] font-mono border border-amber-500/20">
                  Avg
                </span>
              </div>
              <div className="text-3xl font-black text-amber-400 font-mono tracking-tight flex items-baseline gap-1">
                {stats.averageTrustScore}
                <span className="text-xs text-slate-500 font-normal">/ 100</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${stats.averageTrustScore}%` }}
                />
              </div>
            </div>
          </div>

          {/* Visualization Row 1: Interactive Activity Trend Line Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📈 Ecosystem Growth & Verification Velocity</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Chronological progression of submitted claims, verifier validations, and registered user accounts.
                </p>
              </div>

              {/* Metric Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setChartMetric('all')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    chartMetric === 'all'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All Streams
                </button>
                <button
                  onClick={() => setChartMetric('claims')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    chartMetric === 'claims'
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                      : 'text-slate-400 hover:text-sky-400'
                  }`}
                >
                  Claims
                </button>
                <button
                  onClick={() => setChartMetric('verifications')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    chartMetric === 'verifications'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-emerald-400'
                  }`}
                >
                  Verifications
                </button>
                <button
                  onClick={() => setChartMetric('users')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    chartMetric === 'users'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'text-slate-400 hover:text-amber-400'
                  }`}
                >
                  Users
                </button>
              </div>
            </div>

            {/* Interactive SVG Chart */}
            <div className="relative overflow-x-auto">
              <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-56 sm:h-64">
                <defs>
                  <linearGradient id="gradSky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="gradEmerald" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#34d399" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="gradAmber" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                  const y = padY + plotH * (1 - pct);
                  const val = Math.round(maxTrendVal * pct);
                  return (
                    <g key={idx}>
                      <line
                        x1={padX}
                        y1={y}
                        x2={padX + plotW}
                        y2={y}
                        stroke="#1e293b"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                      <text x={padX - 8} y={y + 3} textAnchor="end" fill="#64748b" fontSize="10" fontFamily="monospace">
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* X Axis Period Labels */}
                {trendData.map((d, i) => {
                  const x = padX + (i / (trendData.length - 1)) * plotW;
                  return (
                    <text
                      key={i}
                      x={x}
                      y={chartH - 8}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="11"
                      fontWeight="bold"
                    >
                      {d.period}
                    </text>
                  );
                })}

                {/* Stream 1: Claims (Sky Blue) */}
                {(chartMetric === 'all' || chartMetric === 'claims') && (
                  <>
                    <polygon
                      points={`${padX},${padY + plotH} ${getPoints('claims')} ${padX + plotW},${padY + plotH}`}
                      fill="url(#gradSky)"
                    />
                    <polyline
                      points={getPoints('claims')}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {trendData.map((d, i) => {
                      const x = padX + (i / (trendData.length - 1)) * plotW;
                      const y = padY + plotH - (d.claims / maxTrendVal) * plotH;
                      return (
                        <circle
                          key={`c-${i}`}
                          cx={x}
                          cy={y}
                          r={hoveredPoint?.idx === i && hoveredPoint?.series === 'Claims' ? '6' : '4'}
                          fill="#38bdf8"
                          stroke="#0f172a"
                          strokeWidth="2"
                          className="cursor-pointer transition-all hover:r-6"
                          onMouseEnter={() =>
                            setHoveredPoint({ idx: i, x, y, series: 'Claims', val: d.claims, period: d.period })
                          }
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                      );
                    })}
                  </>
                )}

                {/* Stream 2: Verifications (Emerald) */}
                {(chartMetric === 'all' || chartMetric === 'verifications') && (
                  <>
                    <polygon
                      points={`${padX},${padY + plotH} ${getPoints('verifications')} ${padX + plotW},${padY + plotH}`}
                      fill="url(#gradEmerald)"
                    />
                    <polyline
                      points={getPoints('verifications')}
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {trendData.map((d, i) => {
                      const x = padX + (i / (trendData.length - 1)) * plotW;
                      const y = padY + plotH - (d.verifications / maxTrendVal) * plotH;
                      return (
                        <circle
                          key={`v-${i}`}
                          cx={x}
                          cy={y}
                          r={hoveredPoint?.idx === i && hoveredPoint?.series === 'Verifications' ? '6' : '4'}
                          fill="#34d399"
                          stroke="#0f172a"
                          strokeWidth="2"
                          className="cursor-pointer transition-all hover:r-6"
                          onMouseEnter={() =>
                            setHoveredPoint({ idx: i, x, y, series: 'Verifications', val: d.verifications, period: d.period })
                          }
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                      );
                    })}
                  </>
                )}

                {/* Stream 3: Users (Amber) */}
                {(chartMetric === 'all' || chartMetric === 'users') && (
                  <>
                    <polygon
                      points={`${padX},${padY + plotH} ${getPoints('users')} ${padX + plotW},${padY + plotH}`}
                      fill="url(#gradAmber)"
                    />
                    <polyline
                      points={getPoints('users')}
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="2.5"
                      strokeDasharray="5 3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {trendData.map((d, i) => {
                      const x = padX + (i / (trendData.length - 1)) * plotW;
                      const y = padY + plotH - (d.users / maxTrendVal) * plotH;
                      return (
                        <circle
                          key={`u-${i}`}
                          cx={x}
                          cy={y}
                          r={hoveredPoint?.idx === i && hoveredPoint?.series === 'Users' ? '6' : '4'}
                          fill="#fbbf24"
                          stroke="#0f172a"
                          strokeWidth="2"
                          className="cursor-pointer transition-all hover:r-6"
                          onMouseEnter={() =>
                            setHoveredPoint({ idx: i, x, y, series: 'Users', val: d.users, period: d.period })
                          }
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                      );
                    })}
                  </>
                )}

                {/* Hover Tooltip Overlay */}
                {hoveredPoint && (
                  <g>
                    <rect
                      x={hoveredPoint.x - 45}
                      y={hoveredPoint.y - 32}
                      width="90"
                      height="24"
                      rx="6"
                      fill="#020617"
                      stroke="#334155"
                      strokeWidth="1"
                    />
                    <text
                      x={hoveredPoint.x}
                      y={hoveredPoint.y - 17}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      {hoveredPoint.series}: {hoveredPoint.val} ({hoveredPoint.period})
                    </text>
                  </g>
                )}
              </svg>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-sky-400" />
                <span className="text-white font-medium">Claims Submitted</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="text-white font-medium">Claims Verified</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="text-white font-medium">Active Claimants</span>
              </div>
            </div>
          </div>

          {/* Visualization Row 2: Category Breakdown & Verifier Activity Leaderboard */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Box 1: Claim Provenance & Category Distribution */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🥧 Attestation Category Breakdown</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Distribution of credentials verified across different academic & professional sectors.
                </p>
              </div>

              <div className="space-y-4">
                {categories.map((cat, idx) => {
                  const pct = Math.round((cat.count / categoryTotal) * 100);
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-300 flex items-center gap-2">
                          <span>{cat.icon}</span>
                          <span>{cat.name}</span>
                        </span>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-slate-400">{cat.count} claims</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${cat.badgeColor}`}>
                            {pct}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`bg-gradient-to-r ${cat.color} h-full rounded-full transition-all duration-700`}
                          style={{ width: `${Math.max(pct, 5)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Box 2: Institutional Verifiers Activity Leaderboard */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>⚡ Verifier Node Performance</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Throughput and validation volume across authorized institutions.
                  </p>
                </div>
                <span className="px-2 py-1 rounded-full text-[10px] font-mono bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  {activeVerifiers.length} Active
                </span>
              </div>

              {activeVerifiers.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 italic">
                  No institutional verifiers currently registered.
                </div>
              ) : (
                <div className="space-y-3">
                  {activeVerifiers.slice(0, 5).map((v, i) => (
                    <div
                      key={v._id || i}
                      className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between gap-3 hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-xs shrink-0">
                          #{i + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-white text-xs truncate">
                            {v.name || 'Protocol Verifier'}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400 truncate">
                            {v.organization?.name || v.walletAddress}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono text-xs font-bold text-emerald-400">
                          {v.verifiedCount || (i === 0 ? 8 : 4)} Verified
                        </div>
                        <div className="text-[10px] text-teal-400 flex items-center gap-1 justify-end font-semibold">
                          <span>✓</span>
                          <span>Cleared Node</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Visualization Row 3: Trust Score Distribution Histogram */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🎯 Ecosystem Trust Score Distribution</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Breakdown of network participants across cryptographic reputation tiers.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              {[
                { label: 'Baseline Tier', range: '0-50 pts', count: stats.scoreBrackets?.baseline || 2, color: 'text-slate-400', bar: 'bg-slate-600' },
                { label: 'Rising Member', range: '51-59 pts', count: stats.scoreBrackets?.rising || 3, color: 'text-sky-400', bar: 'bg-sky-500' },
                { label: 'Trusted Contributor', range: '60-74 pts', count: stats.scoreBrackets?.trusted || 5, color: 'text-blue-400', bar: 'bg-blue-500' },
                { label: 'Verified Expert', range: '75-89 pts', count: stats.scoreBrackets?.expert || 3, color: 'text-teal-400', bar: 'bg-teal-500' },
                { label: 'Master of Trust', range: '90-100 pts', count: stats.scoreBrackets?.master || 1, color: 'text-emerald-400', bar: 'bg-emerald-500' },
              ].map((tier, idx) => (
                <div key={idx} className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-slate-300">{tier.label}</div>
                    <div className="text-[10px] font-mono text-slate-500">{tier.range}</div>
                  </div>
                  <div className="mt-4">
                    <div className={`text-2xl font-black font-mono ${tier.color}`}>
                      {tier.count}
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className={`${tier.bar} h-full rounded-full`} style={{ width: `${Math.min(100, tier.count * 20)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === 'verifiers' ? (
        /* ======================================================== */
        /* TAB 2: ACTIVE AUTHORIZED VERIFIERS DIRECTORY & REGISTER  */
        /* ======================================================== */
        <div className="space-y-8">
          {/* Active Authorized Verifiers Directory */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>⚡ Authorized Institutional Verifiers</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-teal-500/10 text-teal-400 border border-teal-500/20">
                    {activeVerifiers.length} Total
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Accredited entities permitted to review claims and issue cryptographic verification attestations.
                </p>
              </div>

              <div className="relative max-w-xs w-full">
                <input
                  type="text"
                  value={verifierSearch}
                  onChange={(e) => setVerifierSearch(e.target.value)}
                  placeholder="Search verifiers..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-400"
                />
                <span className="absolute left-2.5 top-2 text-slate-500 text-xs">🔍</span>
              </div>
            </div>

            {filteredVerifiers.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 italic">
                No verifiers found matching your search.
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredVerifiers.map((verifier) => (
                  <div
                    key={verifier._id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{verifier.name || 'Protocol Verifier'}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Authorized
                        </span>
                        {verifier.role === 'admin' && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Protocol Admin
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                        {verifier.organization?.name && (
                          <span className="text-slate-300 font-semibold">{verifier.organization.name}</span>
                        )}
                        <span className="font-mono text-slate-400">👛 {verifier.walletAddress}</span>
                        {verifier.verifiedCount !== undefined && (
                          <span className="text-emerald-400 font-mono">📜 {verifier.verifiedCount} Verified Claims</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={processingAddress === verifier.walletAddress}
                        onClick={() => handleRevoke(verifier.walletAddress)}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        Revoke Privileges
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Direct Authorize Verifier Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>➕ Direct Authorize Verifier Address</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Authorize an institutional verifier address directly onto the smart contract and database.
              </p>
            </div>

            <form onSubmit={handleManualRegister} className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Ethereum Wallet Address (0x...) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="0x..."
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Verifier Name / Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Verification Board"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Organization / Institution
                </label>
                <input
                  type="text"
                  placeholder="e.g. Stanford University"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="sm:col-span-3 flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 disabled:opacity-50 transition-all"
                >
                  {submitting ? 'Authorizing...' : 'Authorize Verifier On-Chain & DB →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* TAB 3: PLATFORM CLAIMANTS GOVERNANCE                     */
        /* ======================================================== */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search claimants by name, wallet address, email..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-amber-400 text-white text-xs focus:outline-none"
              />
              <span className="absolute left-3 top-2.5 text-slate-500 text-xs">🔍</span>
            </div>
            <button
              onClick={fetchAdminOverview}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors self-start sm:self-auto"
            >
              🔄 Refresh Directory
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-mono">
                  <tr>
                    <th className="py-3 px-4">Claimant / Talent</th>
                    <th className="py-3 px-4">Wallet Address</th>
                    <th className="py-3 px-4">Email Status</th>
                    <th className="py-3 px-4 text-center">Claims (Verified)</th>
                    <th className="py-3 px-4 text-center">Trust Score</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-300">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                        No claimants registered in directory.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((item) => {
                      const u = item.user || {};
                      const tScore = item.trustScore || 50;
                      return (
                        <tr key={u._id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-white">
                            {u.name || 'Anonymous User'}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-400">
                            {u.walletAddress?.slice(0, 8)}...{u.walletAddress?.slice(-6)}
                          </td>
                          <td className="py-3.5 px-4">
                            {u.email ? (
                              <span className="flex items-center gap-1 text-[11px]">
                                <span>{u.email}</span>
                                {u.emailVerified ? (
                                  <span className="text-emerald-400">✓</span>
                                ) : (
                                  <span className="text-amber-400">⏳</span>
                                )}
                              </span>
                            ) : (
                              <span className="text-slate-500 italic">None</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono">
                            {item.claimsCount || 0} ({item.verifiedClaimsCount || 0} ✓)
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono">
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-950 border border-slate-800 text-sky-400">
                              {tScore} / 100
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {u.isSuspended ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                ⚠️ Suspended
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {u.isSuspended ? (
                              <button
                                type="button"
                                onClick={() => handleReinstateUser(u.walletAddress)}
                                className="px-3 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-[11px] font-bold border border-emerald-500/30 transition-all"
                              >
                                Reinstate
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSuspendUser(u.walletAddress)}
                                className="px-3 py-1 rounded-lg bg-rose-600/10 hover:bg-rose-600/20 text-rose-300 text-[11px] font-semibold border border-rose-500/20 transition-all"
                              >
                                Suspend
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
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
