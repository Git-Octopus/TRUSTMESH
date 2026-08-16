export function getStatusColor(status) {
  switch (status?.toLowerCase()) {
    case 'approved':
    case 'verified':
      return 'bg-green-600';
    case 'rejected':
      return 'bg-red-600';
    case 'pending':
    default:
      return 'bg-yellow-600';
  }
}
