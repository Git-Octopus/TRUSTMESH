export function formatHash(hash) {
  if (!hash) return '';
  return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
}
