export function getStatusClasses(status) {
  const norm = (status || '').toUpperCase().replace(/[\s-]/g, '_');
  
  switch (norm) {
    case 'VERIFIED':
      return {
        bg: 'bg-emerald-500/15',
        text: 'text-emerald-400',
        border: 'border-emerald-500/40',
        dot: 'bg-emerald-400',
        label: 'VERIFIED'
      };
    case 'EMAIL_VERIFIED':
      return {
        bg: 'bg-sky-500/15',
        text: 'text-sky-400',
        border: 'border-sky-500/40',
        dot: 'bg-sky-400',
        label: 'EMAIL-VERIFIED'
      };
    case 'EVIDENCE_VALIDATED':
      return {
        bg: 'bg-teal-500/15',
        text: 'text-teal-400',
        border: 'border-teal-500/40',
        dot: 'bg-teal-400',
        label: 'EVIDENCE-VALIDATED'
      };
    case 'PENDING':
    case 'VERIFICATION_PENDING':
      return {
        bg: 'bg-amber-500/15',
        text: 'text-amber-400',
        border: 'border-amber-500/40',
        dot: 'bg-amber-400',
        label: 'PENDING'
      };
    case 'EVIDENCE_CHECK':
      return {
        bg: 'bg-amber-500/15',
        text: 'text-amber-300',
        border: 'border-amber-500/30',
        dot: 'bg-amber-300',
        label: 'EVIDENCE CHECK'
      };
    case 'SUBMITTED':
      return {
        bg: 'bg-blue-500/15',
        text: 'text-blue-400',
        border: 'border-blue-500/40',
        dot: 'bg-blue-400',
        label: 'SUBMITTED'
      };
    case 'DRAFT':
    case 'SELF_CLAIMED':
      return {
        bg: 'bg-slate-500/15',
        text: 'text-slate-400',
        border: 'border-slate-500/40',
        dot: 'bg-slate-400',
        label: norm === 'SELF_CLAIMED' ? 'SELF-CLAIMED' : 'DRAFT'
      };
    case 'REJECTED':
      return {
        bg: 'bg-rose-500/15',
        text: 'text-rose-400',
        border: 'border-rose-500/40',
        dot: 'bg-rose-400',
        label: 'REJECTED'
      };
    case 'REVOKED':
      return {
        bg: 'bg-rose-900/30',
        text: 'text-rose-300',
        border: 'border-rose-700/50',
        dot: 'bg-rose-300',
        label: 'REVOKED'
      };
    default:
      return {
        bg: 'bg-slate-600/15',
        text: 'text-slate-300',
        border: 'border-slate-600/40',
        dot: 'bg-slate-400',
        label: status || 'UNKNOWN'
      };
  }
}

export function getStatusColor(status) {
  const classes = getStatusClasses(status);
  return `${classes.bg} ${classes.text} border ${classes.border}`;
}
