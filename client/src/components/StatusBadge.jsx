import React from 'react';
import { getStatusClasses } from '../utils/statusColor';

/**
 * StatusBadge - Core visual trust indicator for TrustMesh
 * Badges: SELF-CLAIMED | PENDING | EMAIL-VERIFIED | EVIDENCE-VALIDATED | VERIFIED | REJECTED | REVOKED
 */
export default function StatusBadge({ status, size = 'md', showDot = true, customLabel = null }) {
  const meta = getStatusClasses(status);
  const label = customLabel || meta.label;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3.5 py-1.5 text-sm font-semibold'
  }[size] || 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-mono tracking-wider uppercase border transition-colors shadow-sm ${sizeClasses} ${meta.bg} ${meta.text} ${meta.border}`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot} animate-pulse`} />
      )}
      <span>{label}</span>
    </span>
  );
}
