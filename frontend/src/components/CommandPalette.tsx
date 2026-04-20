import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search, FolderOpen, Plus, Moon, Sun, Keyboard, LogOut,
  Home, Layers, FileText, Zap, BookOpen, Loader2, TrendingUp, Clock
} from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { useThemeStore } from '../store/theme';
import api from '../lib/api';
import type { Project } from '../types';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNewProject?: () => void;
}

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  group: string;
  keywords?: string[];
  badge?: string;
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Черновик', active: 'Активный', completed: 'Завершён', archived: 'Архив'
};

export default function CommandPalette({ open, onClose, onNewProject }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const { dark, toggle } = useThemeStore();

  // Load recent projects when palette opens
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
      api.get('/projects?limit=8').then((r) => setProjects(r.data)).catch(() => {});
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  const doSearch = useCallback((q: string) => {
    if (!q.trim()) {
      api.get('/projects?limit=8').then((r) => setProjects(r.data)).catch(() => {});
      setSearching(false);
      return;
    }
    setSearching(true);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/projects/search?q=${encodeURIComponent(q)}`);
        setProjects(data);
      } catch {
        // fallback to client filter
      } finally {
        setSearching(false);
      }
    }, 250);
  }, []);

  useEffect(() => {
    doSearch(query);
  }, [query, doSearch]);

  const staticCommands: Command[] = [
    {
      id: 'home', label: 'Все проекты', description: 'Открыть список проектов',
      icon: <Home className="w-4 h-4" />, group: 'Навигация',
      action: () => { navigate('/'); onClose(); }, keywords: ['главная', 'список'],
    },
    {
      id: 'catalog', label: 'Каталог материалов',
      icon: <BookOpen className="w-4 h-4" />, group: 'Навигация',
      action: () => { navigate('/catalog'); onClose(); }, keywords: ['материалы', 'ресурсы'],
    },
    {
      id: 'new-project', label: 'Новый проект', description: 'Создать новый проект',
      icon: <Plus className="w-4 h-4" />, group: 'Действия', badge: '⌘N',
      action: () => { onClose(); navigate('/'); setTimeout(() => onNewProject?.(), 100); },
      keywords: ['создать', 'проект', 'добавить'],
    },
    {
      id: 'theme', label: dark ? 'Светлая тема' : 'Тёмная тема',
      description: dark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему',
      icon: dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />, group: 'Настройки',
      action: () => { toggle(); onClose(); }, keywords: ['тема', 'dark', 'light', 'цвет'],
    },
    {
      id: 'shortcuts', label: 'Горячие клавиши', description: 'Показать список сочетаний клавиш',
      icon: <Keyboard className="w-4 h-4" />, group: 'Справка', badge: '?',
      action: () => { onClose(); window.dispatchEvent(new CustomEvent('show-shortcuts')); },
      keywords: ['клавиши', 'shortcuts', 'хоткеи'],
    },
    {
      id: 'logout', label: 'Выйти из аккаунта', description: 'Завершить сеанс',
      icon: <LogOut className="w-4 h-4" />, group: 'Аккаунт',
      action: () => { logout(); navigate('/login'); onClose(); },
      keywords: ['выход', 'logout'],
    },
  ];

  const projectCommands: Command[] = projects.slice(0, 8).map((p) => ({
    id: `project-${p.id}`,
    label: p.name,
    description: [STATUS_LABEL[p.status], p.tags].filter(Boolean).join(' · '),
    icon: <FolderOpen className="w-4 h-4" />,
    group: query ? 'Результаты поиска' : 'Недавние проекты',
    action: () => { navigate(`/projects/${p.id}`); onClose(); },
  }));

  const allCommands = [...staticCommands, ...projectCommands];

  const filtered = query && !searching
    ? allCommands.filter((c) => {
        const q = query.toLowerCase();
        return (
          c.label.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.group.toLowerCase().includes(q) ||
          c.keywords?.some((k) => k.includes(q))
        );
      })
    : allCommands;

  const grouped = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    if (!acc[cmd.group]) acc[cmd.group] = [];
    acc[cmd.group].push(cmd);
    return acc;
  }, {});

  const flat = Object.values(grouped).flat();

  useEffect(() => { setSelectedIdx(0); }, [query]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, flat.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && flat[selectedIdx]) {
        flat[selectedIdx].action();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, flat, selectedIdx, onClose]);

  const GROUP_ICONS: Record<string, React.ReactNode> = {
    'Навигация': <Layers className="w-3 h-3" />,
    'Действия': <Zap className="w-3 h-3" />,
    'Результаты поиска': <Search className="w-3 h-3" />,
    'Недавние проекты': <Clock className="w-3 h-3" />,
    'Настройки': <Moon className="w-3 h-3" />,
    'Справка': <Keyboard className="w-3 h-3" />,
    'Аккаунт': <LogOut className="w-3 h-3" />,
  };

  let flatIdx = 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed top-[18vh] left-1/2 -translate-x-1/2 w-full max-w-xl z-50 px-4"
          >
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border)]">
                {searching ? (
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
                ) : (
                  <Search className="w-4 h-4 text-[var(--text-3)] flex-shrink-0" />
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Поиск команд, проектов, действий..."
                  className="flex-1 bg-transparent text-[var(--text-1)] placeholder:text-[var(--text-3)] outline-none text-sm"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="text-[var(--text-3)] hover:text-[var(--text-1)] text-xs px-1.5 py-0.5 rounded bg-[var(--bg-input)] border border-[var(--border)]"
                  >
                    ✕
                  </button>
                )}
                <kbd className="text-xs text-[var(--text-3)] bg-[var(--bg-input)] border border-[var(--border)] px-1.5 py-0.5 rounded font-mono flex-shrink-0">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-[360px] overflow-y-auto py-1.5">
                {flat.length === 0 && !searching ? (
                  <div className="px-4 py-10 text-center text-sm text-[var(--text-3)]">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <div>Ничего не найдено для <strong>«{query}»</strong></div>
                    <div className="text-xs mt-1 opacity-60">Попробуйте другой запрос</div>
                  </div>
                ) : (
                  Object.entries(grouped).map(([group, cmds]) => (
                    <div key={group}>
                      <div className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider sticky top-0 bg-[var(--bg-card)]">
                        {GROUP_ICONS[group]}
                        {group}
                      </div>
                      {cmds.map((cmd) => {
                        const idx = flatIdx++;
                        const isSelected = idx === selectedIdx;
                        return (
                          <button
                            key={cmd.id}
                            onClick={cmd.action}
                            onMouseEnter={() => setSelectedIdx(idx)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'text-[var(--text-1)] hover:bg-[var(--bg-input)]'
                            }`}
                          >
                            <span className={`flex-shrink-0 ${isSelected ? 'text-white' : 'text-[var(--text-3)]'}`}>
                              {cmd.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{cmd.label}</div>
                              {cmd.description && (
                                <div className={`text-xs truncate ${isSelected ? 'text-blue-100' : 'text-[var(--text-3)]'}`}>
                                  {cmd.description}
                                </div>
                              )}
                            </div>
                            {cmd.badge && (
                              <kbd className={`text-[10px] px-1.5 py-0.5 rounded font-mono flex-shrink-0 ${
                                isSelected
                                  ? 'bg-blue-500 text-white border border-blue-400'
                                  : 'bg-[var(--bg-input)] text-[var(--text-3)] border border-[var(--border)]'
                              }`}>
                                {cmd.badge}
                              </kbd>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-[var(--border)] px-4 py-2 flex items-center gap-4 text-xs text-[var(--text-3)]">
                <span className="flex items-center gap-1"><kbd className="bg-[var(--bg-input)] border border-[var(--border)] px-1 rounded font-mono">↑↓</kbd> навигация</span>
                <span className="flex items-center gap-1"><kbd className="bg-[var(--bg-input)] border border-[var(--border)] px-1 rounded font-mono">↵</kbd> выбрать</span>
                <span className="flex items-center gap-1"><kbd className="bg-[var(--bg-input)] border border-[var(--border)] px-1 rounded font-mono">ESC</kbd> закрыть</span>
                <span className="ml-auto opacity-50 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {flat.length} результатов
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
