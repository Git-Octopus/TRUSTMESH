import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useWallet = create(
  persist(
    (set) => ({
      walletAddress: null,
      jwt: null,
      role: null,
      profile: null,

      setWallet: (address, token, role) => {
        set({ walletAddress: address, jwt: token, role });
      },

      setProfile: (profile) => set({ profile }),

      disconnect: () => {
        set({ walletAddress: null, jwt: null, role: null, profile: null });
      }
    }),
    {
      name: 'trustmesh_auth',
    }
  )
);
