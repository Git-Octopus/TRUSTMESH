import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useWallet } from '../hooks/useWallet';
import { formatAddress } from '../utils/formatAddress';

export default function AdminProfilePage() {
  const { walletAddress, user, setUser } = useWallet();
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [name, setName] = useState(user?.name || 'Protocol Administrator');
  const [email, setEmail] = useState(user?.email || 'admin@trustmesh.network');

  useEffect(() => {
    if (walletAddress) {
      loadAdminProfile();
    }
  }, [walletAddress]);

  const loadAdminProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/me');
      if (res.data?.success && res.data.user) {
        setName(res.data.user.name || 'Protocol Administrator');
        setEmail(res.data.user.email || 'admin@trustmesh.network');
        setUser(res.data.user);
      }
    } catch (e) {
      console.warn('Failed to load admin profile:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaveStatus('saving');
      await api.post('/auth/register', {
        walletAddress,
        name: name.trim(),
        email: email.trim(),
        role: 'admin',
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 3000);
      loadAdminProfile();
    } catch (err) {
      console.error('Failed to update admin profile:', err);
      setSaveStatus('error');
    }
  };

  const isDeployer = walletAddress?.toLowerCase() === '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';

  return (
    <div className="max-w-4xl mx-auto pb-16 animate-fadeIn">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono mb-2">
            <span>🛡️ System Governance Administrator</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Admin Protocol Profile</h1>
          <p className="text-sm text-slate-400 mt-1">
            Governance authority over verifier accreditations, smart contract configuration, and protocol integrity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-extrabold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5"
          >
            <span>🛡️ Open Governance Console</span>
          </Link>
        </div>
      </div>

      {/* Governance Authority Card */}
      <div className="p-6 rounded-3xl border border-amber-500/30 bg-amber-950/20 shadow-xl mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="text-3xl sm:text-4xl">👑</div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">TrustMesh Protocol Administrator</h3>
                <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {isDeployer ? 'Master Deployer' : 'Authorized Admin'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                You possess unrestricted protocol management rights. You can approve or revoke institutional verifiers, monitor system user registries, and manage smart contract registry entries.
              </p>
            </div>
          </div>

          <div className="text-xs font-mono bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 text-slate-300 shrink-0">
            <span className="text-slate-500 block text-[10px] uppercase">Admin Signer Address:</span>
            <span className="text-amber-400 font-bold select-all">{formatAddress(walletAddress)}</span>
          </div>
        </div>
      </div>

      {/* Admin Information Form */}
      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Administrator Credentials</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Protocol administrative contact and notifications.
            </p>
          </div>
          {saveStatus === 'saved' && (
            <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              ✓ Admin Profile Updated
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Administrator Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Master Administrator"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 text-white text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Security / Contact Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin@trustmesh.network"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 text-white text-xs focus:outline-none"
            />
          </div>
        </div>

        {/* Protocol Architecture Reference */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-2.5 text-xs font-mono">
          <div className="text-amber-400 font-bold text-[11px] uppercase tracking-wider mb-2">
            ⚙️ Protocol Governance Metadata
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Core Contract:</span>
            <span className="text-slate-200">0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Network ID:</span>
            <span className="text-slate-200">31337 (Localhost EVM Node)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Governance Tier:</span>
            <span className="text-emerald-400 font-bold">ROOT_ADMIN_TIER_0</span>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saveStatus === 'saving'}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all disabled:opacity-50"
          >
            {saveStatus === 'saving' ? 'Saving Updates...' : 'Save Admin Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
