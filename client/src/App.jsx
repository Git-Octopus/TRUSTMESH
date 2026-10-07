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
import ProofReport from './pages/ProofReport';

import WalletConnectButton from './components/WalletConnectButton';
import OnboardingModal from './components/OnboardingModal';

function Navbar() {
  const { walletAddress, role, user, openOnboardingModal } = useWallet();

  const isUser = !role || role === 'owner' || role === 'user';
  const isVerifier = role === 'verifier';
  const isAdmin = role === 'admin';

  return (
    <nav className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md px-4 py-3.5 print:hidden">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-5 sm:space-x-7">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src="/logo.jpg"
              alt="TrustMesh Logo"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover border border-sky-400/30 shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform"
            />
            <span className="text-lg font-black text-white tracking-wide">
              TrustMesh
            </span>
          </Link>

          {walletAddress && (
            <div className="hidden md:flex items-center space-x-5 text-xs font-semibold">
              {/* Standard User Navigation */}
              {isUser && (
                <>
                  <Link to="/claims" className="text-slate-300 hover:text-white transition-colors">
                    My Claims
                  </Link>
                  <Link to="/claims/new" className="text-slate-300 hover:text-white transition-colors">
                    + New Claim
                  </Link>
                  <Link to="/profile" className="text-slate-300 hover:text-white transition-colors">
                    Profile &amp; Documents
                  </Link>
                  <Link
                    to={`/trust-score/${walletAddress}`}
                    className="text-slate-300 hover:text-tm-teal transition-colors"
                  >
                    Trust Score
                  </Link>
                  <Link
                    to={`/proof-report/${walletAddress}`}
                    className="text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1 font-bold"
                  >
                    <span>📄</span>
                    <span>Proof Report</span>
                  </Link>
                </>
              )}

              {/* Verifier Navigation */}
              {isVerifier && (
                <>
                  <Link
                    to="/verifier"
                    className="text-tm-teal hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-tm-teal animate-pulse" />
                    <span>Verifier Queue &amp; Users</span>
                  </Link>
                  <Link to="/profile" className="text-slate-300 hover:text-white transition-colors">
                    Profile
                  </Link>
                </>
              )}

              {/* Admin Navigation */}
              {isAdmin && (
                <>
                  <Link
                    to="/admin"
                    className="text-amber-400 hover:text-white transition-colors flex items-center gap-1"
                  >
                    <span>🛡️</span>
                    <span>Admin Governance</span>
                  </Link>
                  <Link
                    to="/verifier"
                    className="text-tm-teal hover:text-white transition-colors flex items-center gap-1"
                  >
                    Verifier Queue
                  </Link>
                  <Link to="/profile" className="text-slate-300 hover:text-white transition-colors">
                    Profile
                  </Link>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2.5">
          {walletAddress && (
            <button
              onClick={openOnboardingModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all shadow-sm"
              title="Change Account Type (User, Verifier, Admin)"
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">Change Role</span>
            </button>
          )}

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
  const canonicalRole = role === 'admin' ? 'admin' : role === 'verifier' ? 'verifier' : 'user';

  if (!walletAddress) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles) {
    const normalizedAllowed = allowedRoles.map((r) => (r === 'owner' ? 'user' : r));
    if (!normalizedAllowed.includes(canonicalRole)) {
      if (canonicalRole === 'verifier') return <Navigate to="/verifier" replace />;
      if (canonicalRole === 'admin') return <Navigate to="/admin" replace />;
      return <Navigate to="/claims" replace />;
    }
  }

  return children;
}

export default function App() {
  const { user } = useWallet();

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-tm-navy text-slate-100 flex flex-col font-sans selection:bg-tm-blue selection:text-white">
        <OnboardingModal />
        <Navbar />

        {/* Global Suspension Alert if flagged */}
        {user?.isSuspended && (
          <div className="bg-rose-600 text-white text-xs font-semibold px-4 py-2.5 text-center flex items-center justify-center gap-2 shadow-md print:hidden">
            <span>🚨 Account Suspended:</span>
            <span>{user.suspensionReason || 'Your account was flagged by a protocol verifier for suspicious evidence.'}</span>
          </div>
        )}

        <main className="flex-1 container mx-auto p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<Landing />} />

            {/* Profile Route */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="/user/profile" element={<Navigate to="/profile" replace />} />

            {/* User Claims Routes */}
            <Route
              path="/claims"
              element={
                <ProtectedRoute allowedRoles={['user', 'owner']}>
                  <MyClaims />
                </ProtectedRoute>
              }
            />
            <Route path="/user/claims" element={<Navigate to="/claims" replace />} />

            <Route
              path="/claims/new"
              element={
                <ProtectedRoute allowedRoles={['user', 'owner']}>
                  <CreateClaim />
                </ProtectedRoute>
              }
            />
            <Route path="/user/claims/new" element={<Navigate to="/claims/new" replace />} />

            {/* Verifier Routes */}
            <Route
              path="/verifier"
              element={
                <ProtectedRoute allowedRoles={['verifier', 'admin']}>
                  <VerifierDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/verifier/queue" element={<Navigate to="/verifier" replace />} />

            {/* Admin Governance Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminVerifiers />
                </ProtectedRoute>
              }
            />
            <Route path="/admin/governance" element={<Navigate to="/admin" replace />} />

            {/* Public Proof & Verification Audit Routes */}
            <Route path="/claim/:id" element={<ClaimDetails />} />
            <Route path="/trust-score/:wallet" element={<TrustDashboard />} />
            <Route path="/history" element={<VerificationHistory />} />
            <Route path="/history/:claimId" element={<VerificationHistory />} />

            {/* Verifiable Credential Proof Report */}
            <Route path="/proof-report/:wallet" element={<ProofReport />} />
            <Route path="/user/proof-report/:wallet" element={<ProofReport />} />

            {/* Protocol Documentation */}
            <Route path="/docs" element={<Docs />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer className="border-t border-slate-800/80 bg-slate-950/60 py-6 px-4 mt-auto print:hidden">
          <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2.5">
              <img src="/logo.jpg" alt="TrustMesh" className="w-5 h-5 rounded-md object-cover border border-sky-400/20" />
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
