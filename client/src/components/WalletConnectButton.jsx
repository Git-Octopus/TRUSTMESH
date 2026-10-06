import React, { useState } from 'react';
import { ethers } from 'ethers';
import api from '../services/api';
import { useWallet } from '../hooks/useWallet';
import { useNavigate } from 'react-router-dom';

export default function WalletConnectButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { walletAddress, setWallet, disconnect } = useWallet();
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

      setWallet(address, token, role);
      
      if (!user.emailVerified) {
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

  if (walletAddress) {
    return (
      <div className="flex items-center space-x-4">
        <span className="font-mono text-sm bg-tm-charcoal px-3 py-1 rounded border border-gray-700">
          {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
        </span>
        <button 
          onClick={() => { disconnect(); navigate('/'); }}
          className="text-gray-400 hover:text-white text-sm"
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
