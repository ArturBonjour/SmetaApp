import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../store/auth';
import { useThemeStore } from '../../store/theme';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Building2, LogOut, Sun, Moon, Command, LayoutDashboard, BookOpen, ChevronDown, Bell } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../../lib/api';

interface NavbarProps {
  onCommandPalette?: () => void;
}

const AVATAR_GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
];

function avatarGradient(name?: string) {
  if (!name) return AVATAR_GRADIENTS[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length];
}

export default function Navbar({ onCommandPalette }: NavbarProps) {
  const { user, logout } = useAuthStore();
  const { dark, toggle } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activities, setActivities] = useState<Array<{ id: string; action: string; entityName?: string; userName?: string; createdAt: string }>>([]);
  const [unread, setUnread] = useState(0);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    api.get('/activity?limit=10').then((r) => {
      setActivities(r.data?.items || []);
      setUnread(Math.min(r.data?.items?.length || 0, 5));
    }).catch(() => {});
  }, [location.pathname]);

  const handleLogout = () => {
    setShowUserMenu(false);
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const gradient = avatarGradient(user?.name);

  const navLinks = [
    { to: '/', icon: LayoutDashboard, label: 'Проекты' },
    { to: '/catalog', icon: BookOpen, label: 'Каталог' },
  ];

  const roleLabel: Record<string, string> = {
    admin: 'Администратор',
    manager: 'Менеджер',
    estimator: 'Сметчик',
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg-card)]/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 font-bold text-blue-600 dark:text-blue-400 flex-shrink-0">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg tracking-tight hidden sm:block">СметаАпп</span>
        </Link>

        {/* Command palette trigger */}
        {onCommandPalette && (
          <button
            onClick={onCommandPalette}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--text-3)] bg-[var(--bg-input)] border border-[var(--border)] rounded-xl hover:border-blue-400 transition-colors flex-1 max-w-xs"
          >
            <Command className="w-3.5 h-3.5" />
            <span>Быстрый поиск...</span>
            <kbd className="ml-auto text-xs bg-[var(--border)] px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
          </button>
        )}

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = link.to === '/' ? location.pathname === '/' : location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-xl transition-colors
                  ${active
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 font-medium'
                    : 'text-[var(--text-2)] hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-1.5 flex-shrink-0">

          {/* Notification bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setShowNotifications((s) => !s); setUnread(0); }}
              className="relative p-2 rounded-xl text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-input)] transition-colors"
              title="Уведомления"
            >
              <Bell className="w-4 h-4" />
              {unread > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1.5 w-72 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl z-50 overflow-hidden"
                >
                  <div className="px-4 py-2.5 border-b border-[var(--border)] flex items-center justify-between">
                    <span className="text-sm font-semibold text-[var(--text-1)]">Активность</span>
                    <span className="text-xs text-[var(--text-3)]">{activities.length} событий</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {activities.length === 0 ? (
                      <div className="py-8 text-center text-sm text-[var(--text-3)]">Нет активности</div>
                    ) : (
                      activities.slice(0, 10).map((act) => (
                        <div key={act.id} className="px-4 py-2.5 hover:bg-[var(--bg-input)] border-b border-[var(--border)] last:border-0 transition-colors">
                          <div className="text-xs text-[var(--text-2)] leading-relaxed">{act.action?.replace('.', ': ')}</div>
                          {act.entityName && <div className="text-[10px] text-[var(--text-3)] mt-0.5 font-medium truncate">{act.entityName}</div>}
                          {act.userName && <div className="text-[10px] text-[var(--text-3)]">{act.userName}</div>}
                          <div className="text-[10px] text-[var(--text-3)] mt-0.5">
                            {new Date(act.createdAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="px-4 py-2 border-t border-[var(--border)]">
                    <button
                      onClick={() => { setShowNotifications(false); navigate('/'); }}
                      className="text-xs text-blue-500 hover:text-blue-600 transition-colors"
                    >
                      Вся активность →
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Dark mode toggle */}
          <button
            onClick={toggle}
            className="p-2 rounded-xl text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-input)] transition-colors"
            title={dark ? 'Светлая тема' : 'Тёмная тема'}
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu((s) => !s)}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-[var(--bg-input)] transition-colors"
            >
              <div className={`w-7 h-7 bg-gradient-to-br ${gradient} rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0`}>
                {initials}
              </div>
              <span className="hidden sm:block text-sm font-medium text-[var(--text-2)] max-w-[110px] truncate">
                {user?.name}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-3)] transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1.5 w-56 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl z-50 overflow-hidden"
                >
                  {/* User info header */}
                  <div className="px-4 py-3 border-b border-[var(--border)] bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 bg-gradient-to-br ${gradient} rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[var(--text-1)] truncate">{user?.name}</div>
                        <div className="text-xs text-[var(--text-3)] truncate">{user?.email}</div>
                        {user?.role && (
                          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                            {roleLabel[user.role] || user.role}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="py-1.5">
                    <button
                      onClick={() => { setShowUserMenu(false); toggle(); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-[var(--text-1)] hover:bg-[var(--bg-input)] transition-colors"
                    >
                      {dark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                      {dark ? 'Светлая тема' : 'Тёмная тема'}
                    </button>
                    <button
                      onClick={() => { setShowUserMenu(false); onCommandPalette?.(); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-[var(--text-1)] hover:bg-[var(--bg-input)] transition-colors"
                    >
                      <Command className="w-4 h-4 text-blue-500" />
                      Командная палитра
                      <kbd className="ml-auto text-[10px] bg-[var(--bg-input)] border border-[var(--border)] px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
                    </button>
                  </div>

                  <div className="border-t border-[var(--border)] py-1.5">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Выйти из аккаунта
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
