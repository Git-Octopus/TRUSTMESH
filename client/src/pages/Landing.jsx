import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import WalletConnectButton from '../components/WalletConnectButton';

export default function Landing() {
  const { walletAddress, profile } = useWallet();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      {/* Badge / Pill */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs font-mono text-tm-teal mb-6 shadow-sm">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>Ethereum Local & Testnet Ready</span>
      </div>

      {/* Main Hero Header */}
      <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight max-w-4xl leading-tight sm:leading-none mb-6">
        Decentralized Credential Verification & <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-sky-400">Cryptographic Trust</span>
      </h1>

      {/* One-Line Pitch */}
      <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
        Establish verifiable professional skills, work experiences, and peer recommendations anchored permanently to the Ethereum blockchain.
      </p>

      {/* Primary Connect / Navigate Action */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
        {walletAddress ? (
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/claims"
              className="px-8 py-3.5 rounded-2xl bg-tm-blue hover:bg-blue-600 text-white font-bold text-sm transition-all shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2"
            >
              <span>Go to My Claims →</span>
            </Link>
            <Link
              to="/profile"
              className="px-8 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-all border border-slate-700 flex items-center justify-center"
            >
              Edit Profile
            </Link>
          </div>
        ) : (
          <div className="p-1 bg-gradient-to-r from-blue-500 to-teal-400 rounded-2xl shadow-xl shadow-blue-500/20">
            <div className="bg-slate-900 rounded-[14px] p-2">
              <WalletConnectButton />
            </div>
          </div>
        )}
      </div>

      {/* 3 Core Architecture Pillars */}
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl w-full text-left">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl hover:border-slate-700 transition-colors">
          <div className="text-3xl mb-3">🛡️</div>
          <h3 className="text-lg font-bold text-white mb-2">SHA-256 Evidence Hashing</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Attach credential documents, contracts, and degrees. Files are cryptographically hashed and verified against duplicate forgery.
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl hover:border-slate-700 transition-colors">
          <div className="text-3xl mb-3">⚡</div>
          <h3 className="text-lg font-bold text-white mb-2">On-Chain Attestations</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Authorized organizational verifiers and mentors sign verification transactions immutably on <code className="text-tm-teal">TrustMesh.sol</code>.
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl hover:border-slate-700 transition-colors">
          <div className="text-3xl mb-3">📊</div>
          <h3 className="text-lg font-bold text-white mb-2">Algorithmic Trust Score</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Real-time weighted reputation algorithm giving higher weight to institutions (+10) and clients (+8) over self-declarations (0).
          </p>
        </div>
      </div>
    </div>
  );
}
