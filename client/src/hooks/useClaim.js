import { useState } from 'react';

export function useClaim() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);

  return { claims, setClaims, loading, setLoading };
}
