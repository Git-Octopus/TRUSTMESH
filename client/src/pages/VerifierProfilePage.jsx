import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useWallet, isProfileCompleteAndVerified } from '../hooks/useWallet';
import { useOtp } from '../hooks/useOtp';
import OtpInput from '../components/OtpInput';
import { formatAddress } from '../utils/formatAddress';

export default function VerifierProfilePage() {
  const { walletAddress, user, setUser, refreshSession } = useWallet();
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // 'saving' | 'saved' | 'error' | ''
  const [errorMessage, setErrorMessage] = useState('');

  // Form State
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isEmailVerified, setIsEmailVerified] = useState(Boolean(user?.emailVerified));
  const [verifiedEmail, setVerifiedEmail] = useState(user?.emailVerified ? user?.email : '');
  const [orgName, setOrgName] = useState(user?.organization?.name || '');
  const [designation, setDesignation] = useState(user?.organization?.designation || '');
  const [accreditationDocUrl, setAccreditationDocUrl] = useState(user?.organization?.accreditationDocUrl || '');
  const [verifierStatus, setVerifierStatus] = useState(user?.verifierStatus || 'pending_approval');

  // OTP Modal State
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const { loading: otpLoading, error: otpError, setError: setOtpError, sendOtp, verifyOtp, resetOtp } = useOtp();

  useEffect(() => {
    if (walletAddress) {
      loadVerifierProfile();
    }
  }, [walletAddress]);

  const loadVerifierProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/me');
      if (res.data?.success && res.data.user) {
        const u = res.data.user;
        setName(u.name || '');
        setEmail(u.email || '');
        setIsEmailVerified(Boolean(u.emailVerified));
        if (u.emailVerified && u.email) {
          setVerifiedEmail(u.email.toLowerCase().trim());
        }
        setOrgName(u.organization?.name || '');
        setDesignation(u.organization?.designation || '');
        setAccreditationDocUrl(u.organization?.accreditationDocUrl || '');
        setVerifierStatus(u.verifierStatus || (u.role === 'verifier' ? 'approved' : 'pending_approval'));
        setUser(u);
      }
    } catch (err) {
      console.warn('Failed to load verifier session profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenOtpModal = async () => {
    if (!email || !email.includes('@')) {
      alert('Please enter a valid institutional email address first.');
      return;
    }
    resetOtp();
    setIsOtpModalOpen(true);
    await sendOtp(email);
  };

  const handleOtpComplete = async (code) => {
    const res = await verifyOtp(email, code);
    if (res && res.success) {
      setIsEmailVerified(true);
      setVerifiedEmail(email.toLowerCase().trim());
      if (res.token) {
        useWallet.getState().setToken(res.token);
      }
      if (res.user) {
        setUser(res.user);
      }
      await refreshSession();
      setTimeout(() => {
        setIsOtpModalOpen(false);
      }, 1200);
    }
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    if (verifiedEmail && val.trim().toLowerCase() === verifiedEmail.trim().toLowerCase()) {
      setIsEmailVerified(true);
    } else {
      setIsEmailVerified(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaveStatus('saving');
      setErrorMessage('');

      // Update auth profile with organization
      const res = await api.post('/auth/register', {
        walletAddress,
        name: name.trim(),
        email: email.trim(),
        role: 'verifier',
        organization: {
          name: orgName.trim(),
          designation: designation.trim(),
          accreditationDocUrl: accreditationDocUrl.trim(),
        },
      });

      if (res.data?.user) {
        setUser(res.data.user);
        setIsEmailVerified(Boolean(res.data.user.emailVerified));
      }

      // Save organization details in public profile
      await api.put('/profile', {
        name: name.trim(),
        headline: `${designation} at ${orgName}`,
      });

      await refreshSession();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 3000);
      loadVerifierProfile();
    } catch (err) {
      console.error('Failed to update verifier profile:', err);
      setSaveStatus('error');
      setErrorMessage(err.response?.data?.message || 'Failed to update verifier profile.');
    }
  };

  const isStep1Done = isProfileCompleteAndVerified(user, 'verifier');
  const isApproved = verifierStatus === 'approved' || user?.role === 'verifier';
  const isPending = verifierStatus === 'pending_approval';

  return (
    <div className="max-w-4xl mx-auto pb-16 animate-fadeIn">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-tm-teal text-xs font-mono mb-2">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span>Protocol Verifier Console Profile</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Verifier Organization Profile</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your accredited institution identity, designation, and official verifier authorization status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isStep1Done ? (
            <Link
              to="/verifier"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <span>🔍 Verifier Queue &amp; Directory</span>
            </Link>
          ) : (
            <div
              title="Complete your verifier profile & email verification to unlock the verifier queue"
              className="px-4 py-2 rounded-xl bg-slate-800/50 text-slate-500 border border-slate-800 text-xs font-semibold flex items-center gap-1.5 cursor-not-allowed"
            >
              <span>🔒 Verifier Queue (Step 1 Required)</span>
            </div>
          )}
        </div>
      </div>

      {/* Step 1 Mandatory Gate Notice Banner */}
      {!isStep1Done && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-start gap-3.5 shadow-lg animate-pulse">
          <span className="text-2xl shrink-0 mt-0.5">🔒</span>
          <div>
            <div className="font-bold text-sm text-white flex items-center gap-2">
              <span>Step 1 Required: Institutional Profile &amp; Email Verification</span>
              <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40">
                Action Required
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Before accessing the <strong>Verifier Queue</strong> and attesting cryptographic claims, you must save your <strong>Official Name</strong>, <strong>Accredited Organization</strong>, and verify your <strong>Institutional Email</strong> via OTP.
            </p>
          </div>
        </div>
      )}

      {/* Authorization Status Card */}
      <div
        className={`p-6 rounded-3xl border mb-8 shadow-xl transition-all ${
          isApproved
            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
            : isPending
            ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
            : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="text-3xl sm:text-4xl">
              {isApproved ? '🛡️' : isPending ? '⏳' : '⚠️'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">
                  {isApproved
                    ? 'Authorized Protocol Verifier'
                    : isPending
                    ? 'Application Pending Admin Review'
                    : 'Verifier Privileges Revoked'}
                </h3>
                <span
                  className={`text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full font-bold border ${
                    isApproved
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : isPending
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}
                >
                  {verifierStatus}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                {isApproved
                  ? 'Your institutional identity is recognized by the TrustMesh smart contract. You have active cryptographic clearance to verify candidate claims on-chain.'
                  : isPending
                  ? 'Your verifier profile has been submitted and is currently queued for administrator approval. Once approved, you will be able to attest credentials.'
                  : 'Your verifier clearance has been paused or revoked by protocol governance. Please contact the network administrator.'}
              </p>
            </div>
          </div>

          <div className="text-xs font-mono bg-slate-900/80 p-3 rounded-2xl border border-slate-800 text-slate-300 shrink-0">
            <span className="text-slate-500 block text-[10px] uppercase">Signer Address:</span>
            <span className="text-teal-400 font-bold select-all">{formatAddress(walletAddress)}</span>
          </div>
        </div>
      </div>

      {/* Verifier Information Form */}
      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Institutional &amp; Verifier Identity</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              These details are publicly attributed to the on-chain claims you attest.
            </p>
          </div>
          {saveStatus === 'saved' && (
            <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              ✓ Profile Updated
            </span>
          )}
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs">
            ⚠️ {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Verifier Full Name / Official Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. Robert Vance"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 text-white text-xs focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Official Institutional Email <span className="text-rose-400">*</span>
              </label>
              {isEmailVerified ? (
                <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40">
                  ✓ Verified
                </span>
              ) : (
                <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40">
                  UNVERIFIED
                </span>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="e.g. verifier@oxford.edu"
                required
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 text-white text-xs focus:outline-none"
              />
              {!isEmailVerified && (
                <button
                  type="button"
                  onClick={handleOpenOtpModal}
                  className="px-3.5 py-2.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/40 text-teal-300 font-semibold text-xs transition-colors shrink-0 flex items-center justify-center gap-1.5"
                >
                  ✉️ Verify via OTP
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Accredited Organization / University / Enterprise <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="e.g. Oxford Academic Credentialing Board"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 text-white text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Professional Designation <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. Senior Credential Auditor"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 text-white text-xs focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Accreditation Document or Verification Portal URL
          </label>
          <input
            type="url"
            value={accreditationDocUrl}
            onChange={(e) => setAccreditationDocUrl(e.target.value)}
            placeholder="https://institution.org/verification/license-key.pdf"
            className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 text-white text-xs focus:outline-none"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Public link to your organization's registry or official verification policy documentation.
          </p>
        </div>

        {/* Cryptographic Ledger Anchor Info */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 text-xs text-slate-400 space-y-1.5 font-mono">
          <div className="flex items-center justify-between">
            <span>Protocol Contract:</span>
            <span className="text-slate-300">0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Ethereum Chain ID:</span>
            <span className="text-slate-300">31337 (Localhost Hardhat)</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Role Clearance:</span>
            <span className="text-teal-400 font-bold uppercase">ROLE_VERIFIER</span>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saveStatus === 'saving'}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs shadow-md shadow-teal-500/20 transition-all disabled:opacity-50"
          >
            {saveStatus === 'saving' ? 'Saving Updates...' : 'Save Verifier Profile'}
          </button>
        </div>
      </form>

      {/* OTP Verification Modal */}
      {isOtpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 sm:p-8 text-white shadow-2xl relative">
            <button
              onClick={() => setIsOtpModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-mono"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-xl">
                🏛️
              </div>
              <h3 className="text-xl font-bold">Verifier Email Verification</h3>
              <p className="text-xs text-slate-400 mt-1">
                Enter the 6-digit cryptographic verification code sent to:
              </p>
              <p className="font-mono text-xs text-teal-400 mt-1 font-semibold break-all">
                {email}
              </p>
            </div>

            <OtpInput
              onComplete={handleOtpComplete}
              onResend={() => sendOtp(email)}
              isVerifying={otpLoading}
              error={otpError}
            />

            {isEmailVerified && (
              <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center text-xs font-semibold text-emerald-400">
                ✓ Institutional email verified successfully!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
