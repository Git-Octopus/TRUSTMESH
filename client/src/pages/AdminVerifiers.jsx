import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useWallet } from '../hooks/useWallet';
import TxStatusModal from '../components/TxStatusModal';
import { registerOnChainVerifier, revokeOnChainVerifier } from '../services/web3';

export default function AdminVerifiers() {
  const { walletAddress } = useWallet();
  const [verifiers, setVerifiers] = useState([]);
  const [wallet, setWallet] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [processingAddress, setProcessingAddress] = useState(null);

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
    fetchVerifiers();
  }, []);

  const fetchVerifiers = async () => {
    try {
      const res = await api.get('/verifiers');
      setVerifiers(res.data.verifiers || []);
    } catch (err) {
      console.error('Failed to load verifiers:', err);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!wallet || !name) return;

    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet.trim())) {
      alert('Please enter a valid Ethereum address (0x...).');
      return;
    }

    try {
      setLoading(true);
      setTxModal({
        isOpen: true,
        status: 'signing',
        title: 'Register Verifier On-Chain',
        message: 'Please confirm registerVerifier() in MetaMask (Contract Owner only)...',
        txHash: '',
        error: '',
      });

      // 1. Call Smart Contract
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
      } catch (chainErr) {
        console.warn('Smart contract registration skipped or bypassed:', chainErr);
      }

      // 2. Call Backend API
      await api.post('/verifiers', {
        walletAddress: wallet.trim(),
        name: name.trim(),
        transactionHash: txHash,
      });

      setTxModal({
        isOpen: true,
        status: 'success',
        title: 'Verifier Authorized',
        message: `Address ${wallet.slice(0, 8)}... was successfully authorized.`,
        txHash,
        error: '',
      });

      setWallet('');
      setName('');
      fetchVerifiers();
    } catch (err) {
      console.error(err);
      setTxModal({
        isOpen: true,
        status: 'error',
        title: 'Registration Failed',
        message: '',
        txHash: '',
        error: err.reason || err.message || 'Failed to register verifier',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (address) => {
    if (!confirm(`Are you sure you want to revoke verifier authorization for ${address}?`)) {
      return;
    }

    try {
      setProcessingAddress(address);
      setTxModal({
        isOpen: true,
        status: 'signing',
        title: 'Revoke Verifier On-Chain',
        message: 'Please confirm revokeVerifier() in MetaMask (Contract Owner only)...',
        txHash: '',
        error: '',
      });

      // 1. Call Smart Contract
      let txHash = '';
      try {
        const { tx } = await revokeOnChainVerifier(address);
        txHash = tx.hash;

        setTxModal({
          isOpen: true,
          status: 'mining',
          title: 'Mining Revocation',
          message: 'Revoking verifier address on the TrustMesh contract...',
          txHash,
          error: '',
        });
      } catch (chainErr) {
        console.warn('Smart contract revocation skipped or bypassed:', chainErr);
      }

      // 2. Call Backend API
      await api.delete(`/verifiers/${address}`);

      setTxModal({
        isOpen: true,
        status: 'success',
        title: 'Verifier Revoked',
        message: `Verifier ${address.slice(0, 8)}... has been deauthorized.`,
        txHash,
        error: '',
      });

      fetchVerifiers();
    } catch (err) {
      console.error(err);
      setTxModal({
        isOpen: true,
        status: 'error',
        title: 'Revocation Failed',
        message: '',
        txHash: '',
        error: err.reason || err.message || 'Failed to revoke verifier',
      });
    } finally {
      setProcessingAddress(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Admin: Verifier Governance</h1>
        <p className="text-sm text-slate-400 mt-1">
          Authorize trusted institutions and individuals to sign on-chain credential attestations.
        </p>
      </div>

      {/* Registration Form */}
      <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-xl">
        <h2 className="text-lg font-bold text-white mb-2">Authorize New Verifier</h2>
        <p className="text-xs text-slate-400 mb-6">
          This operation calls <code className="text-tm-teal">registerVerifier(address)</code> on the smart contract and saves the record in the registry database.
        </p>

        <form onSubmit={handleRegister} className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-mono uppercase text-slate-400 mb-2">
              Verifier Wallet Address (0x...)
            </label>
            <input
              type="text"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs font-mono focus:outline-none focus:border-tm-blue"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-2">
              Organization / Institution Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. ConsenSys / Stanford University / TechMentor"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-tm-blue"
              required
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-5 rounded-xl bg-tm-blue hover:bg-blue-600 text-white font-semibold text-xs transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {loading ? 'Submitting to Blockchain...' : 'Authorize on Smart Contract ⚡'}
            </button>
          </div>
        </form>
      </div>

      {/* Verifiers Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-950/50">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
            Registered Verifiers ({verifiers.length})
          </h3>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400">
              <th className="px-6 py-3.5">Organization / Name</th>
              <th className="px-6 py-3.5">Wallet Address</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-sm">
            {verifiers.map((v) => (
              <tr key={v._id || v.walletAddress} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4 font-bold text-white text-sm">{v.name}</td>
                <td className="px-6 py-4 font-mono text-xs text-slate-300">
                  {v.walletAddress}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Authorized
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleRevoke(v.walletAddress)}
                    disabled={processingAddress === v.walletAddress}
                    className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors disabled:opacity-40"
                  >
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
            {verifiers.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center py-12 text-slate-500 text-xs italic">
                  No verifiers currently registered in the system.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
