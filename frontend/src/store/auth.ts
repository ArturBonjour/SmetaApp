import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: (() => {
    try {
      const s = localStorage.getItem('smeta_user');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  })(),
  token: localStorage.getItem('smeta_token'),
  isAuthenticated: !!localStorage.getItem('smeta_token'),
  setAuth: (user, token) => {
    localStorage.setItem('smeta_token', token);
    localStorage.setItem('smeta_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('smeta_token');
    localStorage.removeItem('smeta_user');
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
