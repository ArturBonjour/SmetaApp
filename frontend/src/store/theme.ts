import { create } from 'zustand';

interface ThemeState {
  dark: boolean;
  toggle: () => void;
  setDark: (dark: boolean) => void;
}

const stored = localStorage.getItem('smeta_theme');
const initialDark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;

export const useThemeStore = create<ThemeState>((set) => ({
  dark: initialDark,
  toggle: () =>
    set((s) => {
      const next = !s.dark;
      localStorage.setItem('smeta_theme', next ? 'dark' : 'light');
      if (next) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
      return { dark: next };
    }),
  setDark: (dark) => {
    localStorage.setItem('smeta_theme', dark ? 'dark' : 'light');
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    set({ dark });
  },
}));

// Apply initial theme immediately
if (initialDark) document.documentElement.classList.add('dark');
