import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

export default function TrustDashboard() {
  const { wallet } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScore();
  }, [wallet]);

  const fetchScore = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/trust-score/${wallet}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center p-8">Loading Trust Score...</div>;
  if (!data) return <div className="text-center p-8 text-red-400">Profile not found</div>;

  const score = data.trustScore || 0;
  
  let scoreColor = 'text-gray-400';
  if (score >= 90) scoreColor = 'text-tm-verified';
  else if (score >= 75) scoreColor = 'text-tm-teal';
  else if (score >= 60) scoreColor = 'text-tm-blue';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-tm-charcoal p-8 rounded-lg border border-gray-800 shadow-2xl text-center">
        <h2 className="text-2xl font-bold mb-2">Live Trust Score</h2>
        <p className="text-gray-400 font-mono mb-6">{wallet}</p>
        
        <div className="relative inline-flex items-center justify-center mb-6">
          <svg className="w-48 h-48 transform -rotate-90">
            <circle cx="96" cy="96" r="88" className="text-gray-800" strokeWidth="12" stroke="currentColor" fill="transparent" />
            <circle cx="96" cy="96" r="88" className={scoreColor} strokeWidth="12" strokeDasharray={552} strokeDashoffset={552 - (552 * score) / 100} strokeLinecap="round" stroke="currentColor" fill="transparent" />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className={`text-6xl font-bold ${scoreColor}`}>{score}</span>
            <span className="text-sm text-gray-500 uppercase tracking-widest mt-1">/ 100</span>
          </div>
        </div>
        
        {data.badges && data.badges.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {data.badges.map(b => (
              <span key={b} className="px-3 py-1 bg-yellow-900/30 text-yellow-500 border border-yellow-700/50 rounded-full text-sm font-semibold">
                🏆 {b}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="bg-tm-charcoal rounded-lg border border-gray-800 p-6">
        <h3 className="text-xl font-bold mb-4">Score Breakdown</h3>
        <p className="text-sm text-gray-400 mb-6">Base score starts at 50. Points are awarded based on cryptographic verifications.</p>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center p-4 bg-slate-900 rounded border border-gray-700">
            <span>Base Profile</span>
            <span className="font-mono text-gray-400">50 pts</span>
          </div>
          {data.breakdown?.map((item, i) => (
            <div key={i} className="flex justify-between items-center p-4 bg-slate-900 rounded border border-gray-700">
              <div>
                <span className="font-semibold">{item.type}</span>
                <p className="text-sm text-gray-400">{item.title}</p>
              </div>
              <div className="text-right">
                <span className="font-mono text-green-400">+{item.points} pts</span>
                <br/>
                <Link to={`/claim/${item.claimId}`} className="text-xs text-tm-teal hover:underline">View Proof</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
