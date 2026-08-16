import React from 'react';

export default function TxStatusModal({ isOpen, status, txHash, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-slate-800 p-6 rounded-lg max-w-md w-full text-white">
        <h3 className="text-xl font-bold mb-2">Transaction Status</h3>
        <p className="text-gray-300 mb-4">Status: {status || 'Processing...'}</p>
        {txHash && <p className="text-xs font-mono break-all text-blue-400 mb-4">{txHash}</p>}
        <button onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded">
          Close
        </button>
      </div>
    </div>
  );
}
