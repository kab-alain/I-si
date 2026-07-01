import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { User } from '../types/user';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'signup';
  
  login: (user: User) => void;
  logout: () => void;
  setAuthModalOpen: (isOpen: boolean) => void;
  setAuthModalTab: (tab: 'login' | 'signup') => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        isAuthenticated: false,
        isAuthModalOpen: false,
        authModalTab: 'login',

        login: (user) => set({ user, isAuthenticated: true }, false, 'login'),
        logout: () => set({ user: null, isAuthenticated: false }, false, 'logout'),
        setAuthModalOpen: (isAuthModalOpen) => set({ isAuthModalOpen }, false, 'setAuthModalOpen'),
        setAuthModalTab: (authModalTab) => set({ authModalTab }, false, 'setAuthModalTab'),
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    { name: 'AuthStore' }
  )
);
