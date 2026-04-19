import { useAuthStore } from '../../store/auth';
import { useThemeStore } from '../../store/theme';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, LogOut, Sun, Moon, Command, LayoutDashboard } from 'lucide-react';

interface NavbarProps {
  onCommandPalette?: () => void;
}

export default function Navbar({ onCommandPalette }: NavbarProps) {
  const { user, logout } = useAuthStore();
  const { dark, toggle } = useThemeStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg-card)]/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 font-bold text-blue-600 dark:text-blue-400 flex-shrink-0">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg tracking-tight">СметаАпп</span>
        </Link>

        {/* Search / Command palette trigger */}
        {onCommandPalette && (
          <button
            onClick={onCommandPalette}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--text-3)] bg-[var(--bg-input)] border border-[var(--border)] rounded-lg hover:border-blue-400 transition-colors flex-1 max-w-xs"
          >
            <Command className="w-3.5 h-3.5" />
            <span>Быстрый поиск...</span>
            <kbd className="ml-auto text-xs bg-[var(--border)] px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
          </button>
        )}

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            to="/"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[var(--text-2)] hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            Проекты
          </Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Dark mode toggle */}
          <button
            onClick={toggle}
            className="p-2 rounded-lg text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-input)] transition-colors"
            title={dark ? 'Светлая тема' : 'Тёмная тема'}
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User avatar */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
              {initials}
            </div>
            <span className="hidden sm:block text-sm font-medium text-[var(--text-2)] max-w-[120px] truncate">
              {user?.name}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="p-2 text-[var(--text-3)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
            title="Выйти"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

