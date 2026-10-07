import { useState, useCallback } from 'react';
import api from '../services/api';

/**
 * useClaim - Hook for managing claim data, filters, and lifecycle transitions
 */
export function useClaim() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchClaims = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/claims', { params });
      setClaims(res.data.claims || []);
      return res.data.claims || [];
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch claims');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createClaim = useCallback(async (claimData) => {
    try {
      setLoading(true);
      setError('');
      const res = await api.post('/claims', claimData);
      return res.data.claim;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create claim');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const requestVerification = useCallback(async (claimId, verifierWallet) => {
    try {
      setLoading(true);
      setError('');
      const res = await api.post('/verification/request', { claimId, verifierWallet });
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request verification');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    claims,
    setClaims,
    loading,
    error,
    fetchClaims,
    createClaim,
    requestVerification
  };
}
