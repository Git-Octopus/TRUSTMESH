import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

import WalletConnectButton from './components/WalletConnectButton';

function Navbar() {
  const { walletAddress, role } = useWallet();
  
  return (
    <nav className="bg-tm-charcoal border-b border-gray-800 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-6">
          <a href="/" className="text-xl font-bold text-white tracking-wide">TrustMesh</a>
          
          {walletAddress && (
            <div className="flex space-x-4">
              <a href="/claims" className="text-gray-300 hover:text-white">My Claims</a>
              <a href="/claims/new" className="text-gray-300 hover:text-white">Create Claim</a>
              <a href="/profile" className="text-gray-300 hover:text-white">Profile</a>
              
              {(role === 'verifier' || role === 'admin') && (
                <a href="/verifier" className="text-tm-teal hover:text-white">Verifier Queue</a>
              )}
              {role === 'admin' && (
                <a href="/admin" className="text-tm-pending hover:text-white">Admin</a>
              )}
            </div>
          )}
        </div>
        <div>
          <WalletConnectButton />
        </div>
      </div>
    </nav>
  );
}

function ProtectedRoute({ children, allowedRoles }) {
  const { walletAddress, role } = useWallet();
  console.log("[ProtectedRoute] Render. walletAddress:", walletAddress, "role:", role);
  if (!walletAddress) {
    console.log("[ProtectedRoute] Redirecting to / because walletAddress is null");
    return <Navigate to="/" />;
  }
  if (allowedRoles && !allowedRoles.includes(role)) {
    console.log("[ProtectedRoute] Redirecting to /claims because role is unauthorized");
    return <Navigate to="/claims" />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-tm-navy text-gray-100 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 container mx-auto p-4 md:p-8">
          <Routes>
            <Route path="/" element={<Landing />} />
            
            <Route path="/profile" element={
              <ProtectedRoute><Profile /></ProtectedRoute>
            } />
            <Route path="/claims" element={
              <ProtectedRoute><MyClaims /></ProtectedRoute>
            } />
            <Route path="/claims/new" element={
              <ProtectedRoute><CreateClaim /></ProtectedRoute>
            } />
            
            {/* Verifier + Admin Routes */}
            <Route path="/verifier" element={
              <ProtectedRoute allowedRoles={['verifier', 'admin']}><VerifierDashboard /></ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}><AdminVerifiers /></ProtectedRoute>
            } />

            {/* Public Proof Routes */}
            <Route path="/claim/:id" element={<ClaimDetails />} />
            <Route path="/trust-score/:wallet" element={<TrustDashboard />} />
            <Route path="/history/:claimId" element={<VerificationHistory />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
