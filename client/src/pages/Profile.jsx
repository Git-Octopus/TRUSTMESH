import React from 'react';
import { useWallet } from '../hooks/useWallet';
import UserProfilePage from './UserProfilePage';
import VerifierProfilePage from './VerifierProfilePage';
import AdminProfilePage from './AdminProfilePage';

/**
 * ProfileRouter - Architectural separator for User, Verifier, and Admin profile pages.
 * Enforces strict role boundary as specified in spec Section 42.
 */
export default function Profile() {
  const { role, user } = useWallet();
  const canonicalRole = role === 'admin' || user?.role === 'admin'
    ? 'admin'
    : (role === 'verifier' || user?.role === 'verifier' ? 'verifier' : 'user');

  if (canonicalRole === 'admin') {
    return <AdminProfilePage />;
  }

  if (canonicalRole === 'verifier') {
    return <VerifierProfilePage />;
  }

  return <UserProfilePage />;
}
