import React from 'react';
import { formatHash } from '../utils/formatHash';

/**
 * TxStatusModal - MetaMask lifecycle tracker
 * States: 'signing' | 'mining' | 'success' | 'error'
 */
export default function TxStatusModal({
  isOpen,
  status = 'signing', // 'signing' | 'mining' | 'success' | 'error'
  title = 'Blockchain Transaction',
  message = '',
  txHash = '',
  error = '',
  onClose
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl relative">
        {/* Header */}
        <div className="text-center mb-6">
          {status === 'signing' && (
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          )}

          {status === 'mining' && (
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-tm-blue/10 border border-tm-blue/30 flex items-center justify-center">
              <div className="w-8 h-8 border-3 border-tm-blue border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {status === 'success' && (
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}

          {status === 'error' && (
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}

          <h3 className="text-xl font-bold tracking-tight">
            {status === 'signing' && 'Confirm in MetaMask...'}
            {status === 'mining' && 'Confirming on Blockchain...'}
            {status === 'success' && (title || 'Transaction Confirmed!')}
            {status === 'error' && 'Transaction Failed'}
          </h3>

          <p className="text-sm text-slate-400 mt-2">
            {message || (
              status === 'signing'
                ? 'Please check your MetaMask wallet and confirm the requested action.'
                : status === 'mining'
                ? 'Waiting for block confirmation and consensus validation.'
                : status === 'success'
                ? 'The verification state is now permanently immutable on-chain.'
                : error || 'The transaction was rejected or encountered an error.'
            )}
          </p>
        </div>

        {/* Transaction Hash */}
        {txHash && (
          <div className="mb-6 p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
              <span>Transaction Hash</span>
              <span className="text-emerald-400 font-mono text-[10px]">MINED</span>
            </div>
            <p className="font-mono text-xs text-tm-teal break-all select-all">
              {txHash}
            </p>
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-end gap-3 mt-6">
          {(status === 'success' || status === 'error') && (
            <button
              onClick={onClose}
              className={`w-full py-2.5 px-4 rounded-xl font-medium transition-all ${
                status === 'success'
                  ? 'bg-tm-blue hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-white'
              }`}
            >
              {status === 'success' ? 'Done' : 'Dismiss'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
