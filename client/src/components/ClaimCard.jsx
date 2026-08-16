import React from 'react';
import StatusBadge from './StatusBadge';

export default function ClaimCard({ claim }) {
  return (
    <div className="p-4 border rounded-lg bg-slate-800 border-slate-700 text-white">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-bold">{claim?.title || 'Claim Title'}</h3>
        <StatusBadge status={claim?.status} />
      </div>
      <p className="text-sm text-gray-400">{claim?.description || 'Claim description placeholder'}</p>
    </div>
  );
}
