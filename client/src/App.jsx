import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useWallet } from './hooks/useWallet';

import Landing from './pages/Landing';
import Profile from './pages/Profile';
import CreateClaim from './pages/CreateClaim';
import MyClaims from './pages/MyClaims';
import VerifierDashboard from './pages/VerifierDashboard';
import ClaimDetails from './pages/ClaimDetails';
import TrustDashboard from './pages/TrustDashboard';
import VerificationHistory from './pages/VerificationHistory';
import AdminVerifiers from './pages/AdminVerifiers';
import Docs from './pages/Docs';

import WalletConnectButton from './components/WalletConnectButton';

function Navbar() {
  const { walletAddress, role } = useWallet();

  return (
    <nav className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md px-4 py-3.5">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-5 sm:space-x-7">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-white text-base font-extrabold shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              TM
            </span>
            <span className="text-lg font-extrabold text-white tracking-wide">
              TrustMesh
            </span>
          </Link>

          {walletAddress && (
            <div className="hidden md:flex items-center space-x-5 text-xs font-semibold">
              <Link to="/claims" className="text-slate-300 hover:text-white transition-colors">
                My Claims
              </Link>
              <Link to="/claims/new" className="text-slate-300 hover:text-white transition-colors">
                + New Claim
              </Link>
              <Link to="/profile" className="text-slate-300 hover:text-white transition-colors">
                Profile
              </Link>
              <Link
                to={`/trust-score/${walletAddress}`}
                className="text-slate-300 hover:text-tm-teal transition-colors"
              >
                Trust Score
              </Link>

              {(role === 'verifier' || role === 'admin') && (
                <Link
                  to="/verifier"
                  className="text-tm-teal hover:text-white transition-colors flex items-center gap-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-tm-teal animate-pulse" />
                  Verifier Queue
                </Link>
              )}
              {role === 'admin' && (
                <Link
                  to="/admin"
                  className="text-amber-400 hover:text-white transition-colors"
                >
                  Admin
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/docs"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-bold text-sky-400 hover:text-sky-300 transition-all shadow-sm"
          >
            <span>📖</span>
            <span className="hidden sm:inline">Documentation</span>
            <span className="sm:hidden">Docs</span>
          </Link>
          <WalletConnectButton />
        </div>
      </div>
    </nav>
  );
}

function ProtectedRoute({ children, allowedRoles }) {
  const { walletAddress, role } = useWallet();

  if (!walletAddress) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/claims" replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-tm-navy text-slate-100 flex flex-col font-sans selection:bg-tm-blue selection:text-white">
        <Navbar />
        <main className="flex-1 container mx-auto p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<Landing />} />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/claims"
              element={
                <ProtectedRoute>
                  <MyClaims />
                </ProtectedRoute>
              }
            />
            <Route
              path="/claims/new"
              element={
                <ProtectedRoute>
                  <CreateClaim />
                </ProtectedRoute>
              }
            />

            {/* Verifier + Admin Routes */}
            <Route
              path="/verifier"
              element={
                <ProtectedRoute allowedRoles={['verifier', 'admin']}>
                  <VerifierDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminVerifiers />
                </ProtectedRoute>
              }
            />

            {/* Public Proof & Verification Audit Routes */}
            <Route path="/claim/:id" element={<ClaimDetails />} />
            <Route path="/trust-score/:wallet" element={<TrustDashboard />} />
            <Route path="/history" element={<VerificationHistory />} />
            <Route path="/history/:claimId" element={<VerificationHistory />} />

            {/* Protocol Documentation */}
            <Route path="/docs" element={<Docs />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer className="border-t border-slate-800/80 bg-slate-950/60 py-6 px-4 mt-auto">
          <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-300">TrustMesh Protocol</span>
              <span>•</span>
              <span>Decentralized Credential Verification</span>
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              <Link to="/docs" className="text-sky-400 hover:text-sky-300 transition-colors font-medium">
                📖 Protocol Documentation
              </Link>
              <span>•</span>
              <span className="font-mono text-[11px] text-slate-500">Contract: 0xe7f1...0512</span>
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}
