import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, FolderPlus, Save, Trash2, Copy, RotateCcw, TrendingUp, RefreshCw } from 'lucide-react';
import api from '../lib/api';

interface ActivityItem {
  id: string;
  action: string;
  entityName: string;
  entityType: string;
  userName: string;
  metadata?: string;
  createdAt: string;
}

const ACTION_CONFIG: Record<string, { icon: typeof Activity; color: string; label: string }> = {
  'project.create':    { icon: FolderPlus, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30', label: 'Создан проект' },
  'project.update':    { icon: Save, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30', label: 'Обновлён' },
  'project.save':      { icon: Save, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30', label: 'Сохранён' },
  'project.delete':    { icon: Trash2, color: 'text-red-600 bg-red-50 dark:bg-red-950/30', label: 'Удалён' },
  'project.duplicate': { icon: Copy, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/30', label: 'Дублирован' },
  'project.status':    { icon: TrendingUp, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30', label: 'Статус изменён' },
  'project.restore':   { icon: RotateCcw, color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/30', label: 'Версия восстановлена' },
  'project.version':   { icon: RefreshCw, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30', label: 'Новая версия' },
};

const defaultConfig = { icon: Activity, color: 'text-gray-600 bg-gray-100', label: 'Событие' };

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'только что';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} мин назад`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} ч назад`;
  const days = Math.floor(hrs / 24);
  return `${days} дн назад`;
}

export default function ActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const { data } = await api.get('/activity?limit=15');
      setItems(data.items || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-sm text-[var(--text-1)]">Лента активности</span>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="p-1.5 text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-input)] rounded-lg transition-colors"
          title="Обновить"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Items */}
      <div className="divide-y divide-[var(--border)]">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[var(--bg-input)] animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-[var(--bg-input)] rounded animate-pulse w-3/4" />
                  <div className="h-2.5 bg-[var(--bg-input)] rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center">
            <Activity className="w-8 h-8 mx-auto mb-2 text-[var(--text-3)] opacity-30" />
            <p className="text-sm text-[var(--text-3)]">Активность пока не зафиксирована</p>
            <p className="text-xs text-[var(--text-3)] mt-1">Создайте или отредактируйте проект</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {items.map((item, idx) => {
              const cfg = ACTION_CONFIG[item.action] || defaultConfig;
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-start gap-3 px-4 py-2.5 hover:bg-[var(--bg-input)] transition-colors"
                >
                  <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--text-1)] leading-relaxed">
                      <span className="font-medium">{item.userName}</span>
                      {' · '}
                      <span className="text-[var(--text-3)]">{cfg.label}</span>
                    </p>
                    <p className="text-xs text-[var(--text-2)] truncate font-medium mt-0.5">
                      {item.entityName}
                    </p>
                  </div>
                  <span className="text-[10px] text-[var(--text-3)] flex-shrink-0 mt-0.5 whitespace-nowrap">
                    {timeAgo(item.createdAt)}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
