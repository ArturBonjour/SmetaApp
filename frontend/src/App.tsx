import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from './store/auth';
import { useThemeStore } from './store/theme';
import LoginPage from './pages/LoginPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectEditorPage from './pages/ProjectEditorPage';
import CatalogPage from './pages/CatalogPage';
import CommandPalette from './components/CommandPalette';
import KeyboardShortcuts from './components/KeyboardShortcuts';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -8 },
};
const pageTransition = { duration: 0.2, ease: 'easeInOut' as const };

function AnimatedRoutes({ onCommandPalette }: { onCommandPalette: () => void }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname.split('/')[1] || 'home'}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        style={{ minHeight: '100%' }}
      >
        <Routes location={location}>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <ProjectsPage onCommandPalette={onCommandPalette} />
              </PrivateRoute>
            }
          />
          <Route
            path="/catalog"
            element={
              <PrivateRoute>
                <CatalogPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <PrivateRoute>
                <ProjectEditorPage onCommandPalette={onCommandPalette} />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  const { dark } = useThemeStore();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Apply dark class on mount and changes
  useEffect(() => {
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [dark]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K — command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
      // ? — keyboard shortcuts (only when not in input)
      if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as Element)?.tagName)) {
        setShortcutsOpen(true);
      }
    };
    window.addEventListener('keydown', handler);

    // Listen for dispatched event from command palette
    const showShortcuts = () => setShortcutsOpen(true);
    window.addEventListener('show-shortcuts', showShortcuts);

    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('show-shortcuts', showShortcuts);
    };
  }, []);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '12px',
            fontSize: '14px',
            background: dark ? '#1e2535' : '#fff',
            color: dark ? '#f1f5f9' : '#0f172a',
            border: dark ? '1px solid #1e2d4a' : '1px solid #e2e8f0',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          },
        }}
      />
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onNewProject={() => window.dispatchEvent(new CustomEvent('open-new-project'))}
      />
      <KeyboardShortcuts open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <AnimatedRoutes onCommandPalette={() => setCmdOpen(true)} />
    </BrowserRouter>
  );
}
