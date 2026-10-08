import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

/**
 * Normalizes legacy role names to exact 3 product roles: 'user' | 'verifier' | 'admin'
 */
export const normalizeRole = (role) => {
  if (!role || role === 'owner' || role === 'user') return 'user';
  if (role === 'verifier') return 'verifier';
  if (role === 'admin') return 'admin';
  return 'user';
};

/**
 * Evaluates whether a user has completed Step 1 (Profile Creation + Email OTP Verification).
 * Applicable to all 3 roles: 'user', 'verifier', 'admin'.
 */
export const isProfileCompleteAndVerified = (user, role = 'user') => {
  if (!user) return false;
  const canonicalRole = normalizeRole(role || user.role);
  const hasEmail = Boolean(user.email && user.emailVerified);
  const hasName = Boolean(user.name && user.name.trim().length > 0);

  if (canonicalRole === 'verifier') {
    const hasOrg = Boolean(user.organization?.name && user.organization.name.trim().length > 0);
    return hasName && hasOrg && hasEmail;
  }

  return hasName && hasEmail;
};

export const useWallet = create(
  persist(
    (set, get) => ({
      walletAddress: null,
      jwt: null,
      role: 'user', // canonical default
      user: null,
      profile: null,
      isLoadingSession: false,
      isOnboardingModalOpen: false,

      openOnboardingModal: () => set({ isOnboardingModalOpen: true }),
      closeOnboardingModal: () => set({ isOnboardingModalOpen: false }),

      setWallet: (address, token, role, user = null) => {
        const canonicalRole = normalizeRole(role || user?.role);
        set({
          walletAddress: address ? address.toLowerCase() : null,
          jwt: token || null,
          role: canonicalRole,
          user: user || null,
        });
        if (token) {
          localStorage.setItem('token', token);
        }
      },

      setRole: (rawRole) => {
        const canonicalRole = normalizeRole(rawRole);
        set({ role: canonicalRole });
      },

      setUser: (user) => {
        const canonicalRole = normalizeRole(user?.role || get().role);
        set({ user, role: canonicalRole });
      },

      setToken: (jwt) => {
        if (jwt) localStorage.setItem('token', jwt);
        set({ jwt });
      },

      setProfile: (profile) => set({ profile }),

      refreshSession: async () => {
        try {
          set({ isLoadingSession: true });
          const res = await api.get('/auth/me');
          if (res.data?.success && res.data.user) {
            const u = res.data.user;
            const canonicalRole = normalizeRole(u.role);
            set({
              user: u,
              role: canonicalRole,
              walletAddress: u.walletAddress ? u.walletAddress.toLowerCase() : get().walletAddress,
            });
            return u;
          }
        } catch (err) {
          console.warn('[useWallet] Failed to refresh server session:', err.message);
        } finally {
          set({ isLoadingSession: false });
        }
        return null;
      },

      disconnect: () => {
        try {
          localStorage.removeItem('token');
          localStorage.removeItem('trustmesh_auth');
          sessionStorage.clear();
        } catch (e) {
          // ignore storage access errors
        }
        set({
          walletAddress: null,
          jwt: null,
          role: 'user',
          user: null,
          profile: null,
          isLoadingSession: false,
        });
      },
    }),
    {
      name: 'trustmesh_auth',
    }
  )
);

// Listen to MetaMask account & chain changes once if available
if (typeof window !== 'undefined' && window.ethereum) {
  window.ethereum.on('accountsChanged', (accounts) => {
    const currentWallet = useWallet.getState().walletAddress;
    if (!accounts || accounts.length === 0) {
      console.log('[MetaMask] Account disconnected');
      useWallet.getState().disconnect();
      window.location.href = '/';
    } else {
      const newAddress = accounts[0].toLowerCase();
      if (currentWallet && newAddress !== currentWallet) {
        console.log(`[MetaMask] Account changed from ${currentWallet} to ${newAddress}`);
        useWallet.getState().disconnect();
        window.location.href = '/';
      }
    }
  });

  window.ethereum.on('chainChanged', () => {
    console.log('[MetaMask] Network changed. Reloading session...');
    window.location.reload();
  });
}
