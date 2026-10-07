import React, { useState } from 'react';
import { ethers } from 'ethers';
import api from '../services/api';
import { useWallet } from '../hooks/useWallet';
import { useNavigate } from 'react-router-dom';

export default function WalletConnectButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { walletAddress, role, setWallet, setRole, disconnect } = useWallet();
  const navigate = useNavigate();

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('MetaMask not installed');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const address = accounts[0];

      // Request network switch if not on localhost (31337)
      const expectedChainId = import.meta.env.VITE_CHAIN_ID || '31337';
      const hexChainId = '0x' + parseInt(expectedChainId, 10).toString(16);
      
      const { chainId } = await provider.getNetwork();
      if (chainId.toString() !== expectedChainId) {
        try {
          await provider.send('wallet_switchEthereumChain', [{ chainId: hexChainId }]);
        } catch (switchError) {
          // Add network if it doesn't exist (simplified for local)
          if (switchError.code === 4902) {
             console.error("Local network not added to MetaMask");
             setError('Please add Localhost 8545 to MetaMask');
             setLoading(false);
             return;
          }
        }
      }

      // Login flow: Get nonce, sign, login
      const nonceRes = await api.post('/auth/nonce', { walletAddress: address });
      const { nonce, message } = nonceRes.data;

      const signer = await provider.getSigner();
      const signature = await signer.signMessage(message);

      const loginRes = await api.post('/auth/login', { walletAddress: address, signature });
      const { token, role, user } = loginRes.data;
      const effectiveRole = role || user?.role || 'owner';

      setWallet(address, token, effectiveRole, user);
      
      if (!user?.isOnboarded) {
         // Modal will prompt for User/Verifier/Admin selection
      } else if (effectiveRole === 'verifier') {
         navigate('/verifier');
      } else if (effectiveRole === 'admin') {
         navigate('/admin');
      } else if (!user?.emailVerified) {
         navigate('/profile');
      } else {
         navigate('/claims');
      }

    } catch (err) {
      console.error(err);
      setError('Failed to connect or authenticate');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (newRole) => {
    try {
      const serverRole = newRole === 'user' ? 'owner' : newRole;
      const res = await api.post('/auth/switch-role', { role: serverRole });
      if (res.data?.success) {
        setRole(res.data.role);
        if (res.data.token) {
          useWallet.getState().setToken(res.data.token);
        }
      }
    } catch (e) {
      console.error('Failed to switch role:', e);
      setRole(newRole);
    } finally {
      if (newRole === 'verifier') {
        navigate('/verifier');
      } else if (newRole === 'admin') {
        navigate('/admin');
      } else {
        navigate('/claims');
      }
    }
  };

  if (walletAddress) {
    const currentRole = role === 'admin' ? 'admin' : role === 'verifier' ? 'verifier' : 'user';

    return (
      <div className="flex items-center space-x-3">
        {/* Role Switcher & Badge */}
        <div className="relative group">
          <select
            value={currentRole}
            onChange={(e) => handleRoleChange(e.target.value)}
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border cursor-pointer bg-slate-900 focus:outline-none transition-colors ${
              currentRole === 'admin'
                ? 'text-amber-300 border-amber-500/40 bg-amber-500/10'
                : currentRole === 'verifier'
                ? 'text-tm-teal border-tm-teal/40 bg-tm-teal/10'
                : 'text-slate-300 border-slate-700 bg-slate-800/80'
            }`}
            title="Switch Active Testing Role"
          >
            <option value="user" className="bg-slate-900 text-slate-200">👤 User (Claimant)</option>
            <option value="verifier" className="bg-slate-900 text-tm-teal">🔍 Verifier</option>
            <option value="admin" className="bg-slate-900 text-amber-300">🛡️ Admin</option>
          </select>
        </div>

        <span className="font-mono text-xs bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300 shadow-inner">
          {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
        </span>
        <button 
          onClick={() => { disconnect(); navigate('/'); }}
          className="text-slate-400 hover:text-rose-400 text-xs font-medium transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div>
      <button 
        onClick={connectWallet}
        disabled={loading}
        className="bg-tm-blue hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded shadow transition-colors"
      >
        {loading ? 'Connecting...' : 'Connect MetaMask'}
      </button>
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  );
}
