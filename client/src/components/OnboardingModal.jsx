import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useWallet } from '../hooks/useWallet';

export default function OnboardingModal() {
  const { user, walletAddress, setUser, setRole, setToken, isOnboardingModalOpen, closeOnboardingModal } = useWallet();
  const navigate = useNavigate();

  const [accountType, setAccountType] = useState(user?.accountType || 'user'); // 'user' | 'verifier' | 'admin'
  const [name, setName] = useState(user?.name || '');
  const [orgName, setOrgName] = useState(user?.organization?.name || '');
  const [designation, setDesignation] = useState(user?.organization?.designation || '');
  const [adminSecretKey, setAdminSecretKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Show if explicitly opened by user, OR if wallet is connected and accountType is missing/unonboarded
  const isVisible = Boolean(walletAddress && (isOnboardingModalOpen || !user?.accountType || !user?.isOnboarded));

  if (!isVisible) {
    return null;
  }

  const isDeployer = walletAddress?.toLowerCase() === '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
  const canClose = Boolean(user?.accountType && user?.isOnboarded);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      const payload = {
        accountType,
        name: name.trim(),
        organization:
          accountType === 'verifier'
            ? {
                name: orgName.trim(),
                designation: designation.trim(),
              }
            : undefined,
        adminSecretKey: accountType === 'admin' ? adminSecretKey.trim() : undefined,
      };

      const res = await api.post('/auth/onboard', payload);
      if (res.data.success) {
        if (res.data.token) setToken(res.data.token);
        if (res.data.user) {
          setUser(res.data.user);
          setRole(res.data.user.role);
        }

        closeOnboardingModal();

        // Route to the selected account's primary view
        if (accountType === 'verifier') {
          navigate('/verifier');
        } else if (accountType === 'admin') {
          navigate('/admin');
        } else {
          navigate('/claims');
        }
      }
    } catch (err) {
      console.error('Onboarding failed:', err);
      setError(err.response?.data?.message || 'Failed to complete onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 relative">
        {canClose && (
          <button
            onClick={closeOnboardingModal}
            className="absolute top-5 right-5 text-slate-400 hover:text-white text-base font-bold transition-colors"
            title="Close"
          >
            ✕
          </button>
        )}

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-sky-400 text-xs font-mono mb-3">
            <span>✨ TrustMesh Role Setup</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Select Your Account Type
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
            Choose your role to configure your permissions, dashboard, and profile workspace.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-center font-medium">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 3 Account Types Selection Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. User */}
            <button
              type="button"
              onClick={() => setAccountType('user')}
              className={`p-4 rounded-2xl border text-left transition-all ${
                accountType === 'user'
                  ? 'bg-blue-600/15 border-blue-500 shadow-md shadow-blue-500/15'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="text-2xl mb-1.5">👤</div>
              <div className="text-sm font-bold text-white">Standard User</div>
              <div className="text-[11px] text-slate-400 mt-1 leading-snug">
                Submit claims, upload proof documents, and export credential reports.
              </div>
              <span className="inline-block mt-2.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                Instant Active
              </span>
            </button>

            {/* 2. Verifier */}
            <button
              type="button"
              onClick={() => setAccountType('verifier')}
              className={`p-4 rounded-2xl border text-left transition-all ${
                accountType === 'verifier'
                  ? 'bg-teal-500/15 border-teal-500 shadow-md shadow-teal-500/15'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="text-2xl mb-1.5">🔍</div>
              <div className="text-sm font-bold text-white">Verifier</div>
              <div className="text-[11px] text-slate-400 mt-1 leading-snug">
                Review candidate documents, verify claims on-chain, and flag accounts.
              </div>
              <span className="inline-block mt-2.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/20">
                Admin Review
              </span>
            </button>

            {/* 3. Admin */}
            <button
              type="button"
              onClick={() => setAccountType('admin')}
              className={`p-4 rounded-2xl border text-left transition-all ${
                accountType === 'admin'
                  ? 'bg-amber-500/15 border-amber-500 shadow-md shadow-amber-500/15'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="text-2xl mb-1.5">🛡️</div>
              <div className="text-sm font-bold text-white">Administrator</div>
              <div className="text-[11px] text-slate-400 mt-1 leading-snug">
                Govern verifiers, oversee protocol users, and inspect contract status.
              </div>
              <span className="inline-block mt-2.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-sky-300 border border-blue-500/20">
                Governance
              </span>
            </button>
          </div>

          {/* Dynamic Form Fields Based on Role */}
          <div className="space-y-4 p-4 rounded-2xl bg-slate-950 border border-slate-800/80">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Your Name / Organization Contact *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Jane Doe"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {accountType === 'verifier' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Accredited Organization / Institution *
                  </label>
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g., Stanford University / Google LLC"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Professional Designation / Role *
                  </label>
                  <input
                    type="text"
                    required
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g., Lead Credential Auditor / Academic Dean"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300/90 text-xs">
                  ℹ️ Verifier accounts start in <strong>Pending Approval</strong> state. The Protocol Admin will review your organization credentials before verification permissions are granted.
                </div>
              </>
            )}

            {accountType === 'admin' && (
              <>
                {isDeployer ? (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                    ✓ Connected with Contract Deployer wallet ({walletAddress.slice(0, 8)}...). Admin authorization automatically granted.
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Admin Secret Passcode *
                    </label>
                    <input
                      type="password"
                      required
                      value={adminSecretKey}
                      onChange={(e) => setAdminSecretKey(e.target.value)}
                      placeholder="Enter administrative authorization key"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-bold text-sm transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50"
          >
            {loading ? 'Initializing Profile...' : `Confirm & Enter as ${accountType === 'user' ? 'User' : accountType === 'verifier' ? 'Verifier' : 'Admin'} →`}
          </button>
        </form>
      </div>
    </div>
  );
}
