import { useState, useCallback } from 'react';
import { sendOtp as apiSendOtp, verifyOtp as apiVerifyOtp } from '../services/auth';

/**
 * useOtp - Hook for handling email OTP challenge, resend, and verification state
 */
export function useOtp() {
  const [loading, setLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState('');

  const sendOtp = useCallback(async (email) => {
    if (!email) {
      setError('Email address is required');
      return false;
    }
    try {
      setLoading(true);
      setError('');
      await apiSendOtp(email);
      setIsSent(true);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP code');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyOtp = useCallback(async (email, code) => {
    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return false;
    }
    try {
      setLoading(true);
      setError('');
      const res = await apiVerifyOtp(email, code);
      setIsVerified(true);
      return res;
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP code');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetOtp = useCallback(() => {
    setIsSent(false);
    setIsVerified(false);
    setError('');
  }, []);

  return {
    loading,
    isSent,
    isVerified,
    error,
    setError,
    sendOtp,
    verifyOtp,
    resetOtp
  };
}
