import React from 'react';

export default function WalletConnectButton({ address, onConnect }) {
  return (
    <button
      onClick={onConnect}
      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded transition"
    >
      {address ? `Connected: ${address.slice(0, 6)}...${address.slice(-4)}` : 'Connect Wallet'}
    </button>
  );
}
