import { create } from 'zustand';

interface AuthStore {
  isAuthenticated: boolean;
  user: { name: string; email: string } | null;
  login: (email: string, _password: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  isAuthenticated: false,
  user: null,

  login: (email: string) => {
    set({
      isAuthenticated: true,
      user: { name: email.split('@')[0], email },
    });
  },

  logout: () => {
    set({ isAuthenticated: false, user: null });
  },
}));
