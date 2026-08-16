import React from 'react';

export default function VerifierQueueRow({ claim, onVerify }) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700">
      <div>
        <h4 className="font-semibold text-white">{claim?.title || 'Claim'}</h4>
        <p className="text-xs text-gray-400">Submitted by: {claim?.userAddress || '0x...'}</p>
      </div>
      <button
        onClick={() => onVerify?.(claim?.id)}
        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
      >
        Review
      </button>
    </div>
  );
}
