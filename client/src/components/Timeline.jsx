import React from 'react';
import StatusBadge from './StatusBadge';
import { formatAddress } from '../utils/formatAddress';

/**
 * Timeline - Reusable vertical chronological audit trail for claim verification events
 */
export default function Timeline({ events = [], emptyMessage = 'No verification events recorded yet.' }) {
  if (!events || events.length === 0) {
    return (
      <div className="py-8 text-center text-slate-500 text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-[11px] sm:before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-800">
      {events.map((evt, idx) => {
        const timestamp = evt.createdAt || (evt.blockchainTimestamp ? evt.blockchainTimestamp * 1000 : null);
        const dateStr = timestamp ? new Date(timestamp).toLocaleString() : 'Pending confirmation';

        const nodeColor =
          evt.status === 'VERIFIED'
            ? 'bg-emerald-500 ring-emerald-500/20'
            : evt.status === 'REJECTED' || evt.status === 'REVOKED'
            ? 'bg-rose-500 ring-rose-500/20'
            : evt.status === 'EVIDENCE_CHECK'
            ? 'bg-teal-500 ring-teal-500/20'
            : 'bg-amber-500 ring-amber-500/20';

        return (
          <div key={evt._id || idx} className="relative group">
            {/* Pulsing indicator node */}
            <div
              className={`absolute -left-[23px] sm:-left-[27px] top-1.5 w-4 h-4 rounded-full border-2 border-slate-900 ${nodeColor} ring-4 transition-all`}
            />

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg group-hover:border-slate-700 transition-colors">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <StatusBadge status={evt.status} size="sm" />
                <span className="text-xs text-slate-500 font-mono">{dateStr}</span>
              </div>

              {evt.comments && (
                <p className="text-sm text-slate-300 mt-2 mb-3 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
                  {evt.comments}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-2 font-mono">
                {evt.verifierWallet && (
                  <div>
                    <span className="text-slate-500">Actor: </span>
                    <span className="text-slate-300">{formatAddress(evt.verifierWallet)}</span>
                  </div>
                )}
                {evt.method && (
                  <div>
                    <span className="text-slate-500">Method: </span>
                    <span className="text-slate-300 capitalize">{evt.method}</span>
                  </div>
                )}
                {evt.transactionHash && (
                  <div>
                    <span className="text-slate-500">Tx: </span>
                    <span className="text-tm-teal break-all">{evt.transactionHash.slice(0, 10)}...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
