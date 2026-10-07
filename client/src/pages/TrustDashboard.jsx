import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import TrustScoreChart from '../components/TrustScoreChart';
import StatusBadge from '../components/StatusBadge';

export default function TrustDashboard() {
  const { wallet } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScoreData();
  }, [wallet]);

  const fetchScoreData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/trust-score/${wallet}`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch trust score details, attempting profile fallback:', err);
      try {
        const profRes = await api.get(`/profile/${wallet}`);
        if (profRes.data) {
          const rawScore = profRes.data.trustScore;
          const scoreNum = typeof rawScore === 'object' && rawScore !== null
            ? (rawScore.score ?? 50)
            : (rawScore ?? 50);
          setData({
            success: true,
            trustScore: scoreNum,
            score: scoreNum,
            breakdown: typeof rawScore === 'object' ? (rawScore.breakdown || {}) : {},
            badges: typeof rawScore === 'object' ? (rawScore.badges || ['Rising Member']) : ['Rising Member'],
            verifiedClaims: (profRes.data.claims || []).filter((c) => c.status === 'VERIFIED'),
          });
        }
      } catch (e2) {
        // Safe baseline initialization
        setData({
          success: true,
          trustScore: 50,
          score: 50,
          breakdown: { organization: 0, mentorClient: 0, peer: 0, self: 0, other: 0 },
          badges: ['Rising Member'],
          verifiedClaims: [],
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-8 h-8 border-3 border-tm-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const rawScore = data?.trustScore !== undefined ? data.trustScore : data?.score;
  const score = typeof rawScore === 'object' && rawScore !== null ? (rawScore.score ?? 50) : (rawScore ?? 50);
  const breakdownCounts = data?.breakdown || {};
  const badges = data?.badges || ['Rising Member'];
  const verifiedClaims = data?.verifiedClaims || [];

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-8">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
        <div>
          <span className="text-xs font-bold text-white">TrustMesh Verifiable Identity</span>
          <p className="text-[11px] text-slate-400">Export official cryptographic credential proof report for employers and institutions.</p>
        </div>
        <Link
          to={`/proof-report/${wallet}`}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all"
        >
          <span>📄</span>
          <span>Generate Proof Report →</span>
        </Link>
      </div>

      {/* Visual Chart with Radial Gauge and Source Weights */}
      <TrustScoreChart
        score={score}
        breakdown={breakdownCounts}
        badges={badges}
        walletAddress={wallet}
      />

      {/* Contributing Claims List */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <h3 className="text-xl font-bold text-white mb-2">Contributing Credential Records</h3>
        <p className="text-xs text-slate-400 mb-6">
          Each verified credential adds weighted trust capital based on verification provenance.
        </p>

        {verifiedClaims.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            No verified claims currently contribute to this score. Baseline score is 50.
          </div>
        ) : (
          <div className="space-y-3">
            {verifiedClaims.map((item, idx) => (
              <div
                key={item.claimId || idx}
                className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-800 text-slate-300">
                      {item.type}
                    </span>
                    <h4 className="text-sm font-bold text-white">{item.title}</h4>
                  </div>
                  {item.verifierWallet && (
                    <p className="font-mono text-xs text-slate-500">
                      Verified by: {item.verifierWallet.slice(0, 8)}...{item.verifierWallet.slice(-6)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                    +{item.points || 10} pts
                  </span>
                  <Link
                    to={`/claim/${item.claimId}`}
                    className="text-xs text-tm-teal hover:underline font-medium"
                  >
                    View Proof →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
