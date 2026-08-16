import React from 'react';

export default function StatusBadge({ status }) {
  return (
    <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-600 text-white">
      {status || 'Pending'}
    </span>
  );
}
