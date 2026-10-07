import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useWallet = create(
  persist(
    (set) => ({
      walletAddress: null,
      jwt: null,
      role: 'owner',
      user: null,
      profile: null,

      setWallet: (address, token, role, user = null) => {
        set({
          walletAddress: address,
          jwt: token,
          role: role || 'owner',
          ...(user ? { user } : {}),
        });
      },

      setRole: (role) => set({ role }),
      setUser: (user) => set({ user }),
      setToken: (jwt) => set({ jwt }),
      setProfile: (profile) => set({ profile }),

      disconnect: () => {
        set({ walletAddress: null, jwt: null, role: null, user: null, profile: null });
      },
    }),
    {
      name: 'trustmesh_auth',
    }
  )
);
