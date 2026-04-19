import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search, FolderOpen, Plus, Moon, Sun, Keyboard, LogOut,
  Home, Layers, FileText, Zap
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
}

export default function CommandPalette({ open, onClose, onNewProject }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const { dark, toggle } = useThemeStore();

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
      api.get('/projects').then((r) => setProjects(r.data)).catch(() => {});
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const staticCommands: Command[] = [
    {
      id: 'home', label: 'Все проекты', icon: <Home className="w-4 h-4" />, group: 'Навигация',
      action: () => { navigate('/'); onClose(); },
    },
    {
      id: 'new-project', label: 'Новый проект', description: 'Создать новый проект',
      icon: <Plus className="w-4 h-4" />, group: 'Действия',
      action: () => { onClose(); navigate('/'); setTimeout(() => onNewProject?.(), 100); },
    },
    {
      id: 'theme', label: dark ? 'Светлая тема' : 'Тёмная тема',
      icon: dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />, group: 'Настройки',
      action: () => { toggle(); onClose(); },
    },
    {
      id: 'shortcuts', label: 'Горячие клавиши', description: 'Показать список сочетаний клавиш',
      icon: <Keyboard className="w-4 h-4" />, group: 'Справка',
      action: () => { onClose(); window.dispatchEvent(new CustomEvent('show-shortcuts')); },
    },
    {
      id: 'logout', label: 'Выйти', icon: <LogOut className="w-4 h-4" />, group: 'Аккаунт',
      action: () => { logout(); navigate('/login'); onClose(); },
    },
  ];

  const projectCommands: Command[] = projects.slice(0, 8).map((p) => ({
    id: `project-${p.id}`,
    label: p.name,
    description: p.description || p.status,
    icon: <FolderOpen className="w-4 h-4" />,
    group: 'Проекты',
    action: () => { navigate(`/projects/${p.id}`); onClose(); },
  }));

  const allCommands = [...staticCommands, ...projectCommands];

  const filtered = query
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

  // Group filtered commands
  const grouped = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    if (!acc[cmd.group]) acc[cmd.group] = [];
    acc[cmd.group].push(cmd);
    return acc;
  }, {});

  const flat = Object.values(grouped).flat();

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

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
    'Проекты': <FolderOpen className="w-3 h-3" />,
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
            className="fixed top-[20vh] left-1/2 -translate-x-1/2 w-full max-w-xl z-50 px-4"
          >
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border)]">
                <Search className="w-4 h-4 text-[var(--text-3)] flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Поиск команд и проектов..."
                  className="flex-1 bg-transparent text-[var(--text-1)] placeholder:text-[var(--text-3)] outline-none text-sm"
                />
                <kbd className="text-xs text-[var(--text-3)] bg-[var(--bg-input)] border border-[var(--border)] px-1.5 py-0.5 rounded font-mono">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-80 overflow-y-auto py-2">
                {flat.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-[var(--text-3)]">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Ничего не найдено
                  </div>
                ) : (
                  Object.entries(grouped).map(([group, cmds]) => (
                    <div key={group}>
                      <div className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider">
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
                            <span className={isSelected ? 'text-white' : 'text-[var(--text-3)]'}>
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
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
