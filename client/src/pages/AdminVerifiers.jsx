import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useWallet } from '../hooks/useWallet';

export default function AdminVerifiers() {
  const [verifiers, setVerifiers] = useState([]);
  const [wallet, setWallet] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchVerifiers();
  }, []);

  const fetchVerifiers = async () => {
    try {
      const res = await api.get('/verifiers');
      setVerifiers(res.data.verifiers || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!wallet || !name) return;
    
    try {
      setLoading(true);
      await api.post('/verifiers', { walletAddress: wallet, name });
      alert('Verifier registered successfully');
      setWallet('');
      setName('');
      fetchVerifiers();
    } catch (err) {
      alert('Failed to register verifier');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (address) => {
    try {
      await api.delete(`/verifiers/${address}`);
      fetchVerifiers();
    } catch (err) {
      alert('Failed to revoke verifier');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h2 className="text-2xl font-bold">Admin: Manage Verifiers</h2>
      
      <div className="bg-tm-charcoal p-6 rounded-lg border border-gray-800 shadow-xl">
        <h3 className="text-xl font-semibold mb-4">Register New Verifier</h3>
        <form onSubmit={handleRegister} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-1">Wallet Address</label>
            <input type="text" value={wallet} onChange={e=>setWallet(e.target.value)} className="w-full bg-slate-900 border border-gray-700 rounded p-2 text-white font-mono" placeholder="0x..." required />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-1">Organization / Name</label>
            <input type="text" value={name} onChange={e=>setName(e.target.value)} className="w-full bg-slate-900 border border-gray-700 rounded p-2 text-white" required />
          </div>
          <button type="submit" disabled={loading} className="bg-tm-blue hover:bg-blue-600 px-6 py-2 rounded font-semibold transition-colors">
            {loading ? 'Adding...' : 'Register'}
          </button>
        </form>
      </div>

      <div className="bg-tm-charcoal rounded-lg border border-gray-800 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="px-6 py-3 font-medium text-gray-300">Name</th>
              <th className="px-6 py-3 font-medium text-gray-300">Wallet</th>
              <th className="px-6 py-3 font-medium text-gray-300">Status</th>
              <th className="px-6 py-3 font-medium text-gray-300">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {verifiers.map(v => (
              <tr key={v._id}>
                <td className="px-6 py-4 font-semibold">{v.name}</td>
                <td className="px-6 py-4 font-mono text-sm">{v.walletAddress}</td>
                <td className="px-6 py-4 text-green-400 text-sm font-semibold">Authorized</td>
                <td className="px-6 py-4">
                  <button onClick={() => handleRevoke(v.walletAddress)} className="text-red-400 hover:text-red-300 text-sm">Revoke</button>
                </td>
              </tr>
            ))}
            {verifiers.length === 0 && (
              <tr><td colSpan="4" className="text-center py-8 text-gray-500">No verifiers registered</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
