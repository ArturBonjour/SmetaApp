import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import type { Project, ProjectTemplate } from '../types';
import toast from 'react-hot-toast';
import {
  Plus, Building2, Clock, Trash2, Search, Copy, TrendingUp, FolderOpen,
  CheckCircle, Archive, LayoutGrid, List, SortAsc, Tag, Calendar, DollarSign,
  ChevronDown, X, Filter,
} from 'lucide-react';
import Navbar from '../components/Layout/Navbar';
import ActivityFeed from '../components/ActivityFeed';

interface Props {
  onCommandPalette?: () => void;
}

interface Stats {
  total: number;
  totalAmount: number;
  byStatus: { draft: number; active: number; completed: number; archived: number };
}

// ---- Mini floor-plan thumbnail ----
function FloorPlanThumb({ geometryJson }: { geometryJson?: string }) {
  if (!geometryJson) return null;
  let geo: any;
  try { geo = JSON.parse(geometryJson); } catch { return null; }
  const els: any[] = geo.elements || [];
  if (els.length === 0) return null;
  const W = 72, H = 50, PAD = 4;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of els) {
    if (el.type === 'wall') {
      minX = Math.min(minX, el.x1, el.x2); minY = Math.min(minY, el.y1, el.y2);
      maxX = Math.max(maxX, el.x1, el.x2); maxY = Math.max(maxY, el.y1, el.y2);
    } else {
      minX = Math.min(minX, el.x ?? 0); minY = Math.min(minY, el.y ?? 0);
      maxX = Math.max(maxX, (el.x ?? 0) + (el.width ?? 1));
      maxY = Math.max(maxY, (el.y ?? 0) + (el.depth ?? 1));
    }
  }
  if (!isFinite(minX)) return null;
  const bw = maxX - minX || 1, bh = maxY - minY || 1;
  const sc = Math.min((W - PAD * 2) / bw, (H - PAD * 2) / bh);
  const tx = (x: number) => PAD + (x - minX) * sc;
  const ty = (y: number) => PAD + (y - minY) * sc;
  const COLORS: Record<string, string> = {
    wall: '#334155', floor: '#bfdbfe', roof: '#fef3c7',
    window: '#bae6fd', door: '#fecaca', foundation: '#d1fae5',
  };
  return (
    <svg width={W} height={H} className="rounded overflow-hidden bg-slate-50 dark:bg-slate-800/50 flex-shrink-0">
      {els.map((el: any, i: number) => {
        const c = COLORS[el.type] || '#e2e8f0';
        if (el.type === 'wall') {
          return <line key={i} x1={tx(el.x1)} y1={ty(el.y1)} x2={tx(el.x2)} y2={ty(el.y2)} stroke={c} strokeWidth={1.5} strokeLinecap="round" />;
        }
        const x = el.x ?? 0, y = el.y ?? 0, w = el.width ?? 1, h = el.depth ?? 1;
        return <rect key={i} x={tx(x)} y={ty(y)} width={w * sc} height={h * sc} fill={c} fillOpacity={0.7} stroke={c} strokeWidth={0.5} rx={1} />;
      })}
    </svg>
  );
}

// ---- Tag chips ----
const TAG_COLORS = [
  'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
];
function tagColor(tag: string) {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = tag.charCodeAt(i) + ((h << 5) - h);
  return TAG_COLORS[Math.abs(h) % TAG_COLORS.length];
}
function TagChip({ tag, onRemove }: { tag: string; onRemove?: () => void }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${tagColor(tag)}`}>
      {tag}
      {onRemove && (
        <button onClick={onRemove} className="hover:opacity-70">
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </span>
  );
}

// ---- Status config ----
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  draft:     { label: 'Черновик',  bg: 'bg-slate-100 dark:bg-slate-800',      text: 'text-slate-600 dark:text-slate-300',  dot: 'bg-slate-400' },
  active:    { label: 'Активный',  bg: 'bg-blue-50 dark:bg-blue-950/40',       text: 'text-blue-700 dark:text-blue-300',    dot: 'bg-blue-500 animate-pulse' },
  completed: { label: 'Завершён',  bg: 'bg-green-50 dark:bg-green-950/40',     text: 'text-green-700 dark:text-green-300',  dot: 'bg-green-500' },
  archived:  { label: 'Архив',     bg: 'bg-yellow-50 dark:bg-yellow-950/40',   text: 'text-yellow-700 dark:text-yellow-300', dot: 'bg-yellow-500' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ---- Skeleton ----
function SkeletonCard() {
  return (
    <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-5 animate-pulse">
      <div className="h-4 bg-[var(--bg-input)] rounded w-3/4 mb-3" />
      <div className="h-3 bg-[var(--bg-input)] rounded w-1/2 mb-4" />
      <div className="flex gap-2"><div className="h-5 w-16 bg-[var(--bg-input)] rounded-full" /></div>
    </div>
  );
}

// ---- Deadline badge ----
function DeadlineBadge({ deadline }: { deadline?: string }) {
  if (!deadline) return null;
  const d = new Date(deadline);
  const now = new Date();
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / 86400000);
  const label = d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
  const color = diffDays < 0
    ? 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30'
    : diffDays <= 7
    ? 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30'
    : 'text-slate-500 bg-slate-100 dark:text-slate-400 dark:bg-slate-800';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${color}`}>
      <Calendar className="w-2.5 h-2.5" />
      {diffDays < 0 ? `просрочен` : diffDays === 0 ? 'сегодня' : label}
    </span>
  );
}

// ---- Sort options ----
type SortKey = 'updatedAt' | 'createdAt' | 'name' | 'amount' | 'deadline';
const SORT_LABELS: Record<SortKey, string> = {
  updatedAt: 'По изменению',
  createdAt: 'По созданию',
  name: 'По названию',
  amount: 'По сумме',
  deadline: 'По сроку',
};

export default function ProjectsPage({ onCommandPalette }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', description: '', templateId: '', tags: '', deadline: '', budget: '' });
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const sortMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    const handler = () => setShowNew(true);
    window.addEventListener('open-new-project', handler);
    return () => window.removeEventListener('open-new-project', handler);
  }, []);
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setShowNew(true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) setShowSortMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadData = async () => {
    try {
      const [pRes, tRes, sRes] = await Promise.all([
        api.get('/projects'),
        api.get('/projects/templates/list'),
        api.get('/projects/stats'),
      ]);
      setProjects(pRes.data);
      setTemplates(tRes.data);
      setStats(sRes.data);
    } catch (err: any) {
      if (err?.response?.status !== 401) {
        toast.error('Ошибка загрузки');
      }
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!newForm.name.trim()) { toast.error('Введите название'); return; }
    setCreating(true);
    try {
      const { data } = await api.post('/projects', {
        name: newForm.name,
        description: newForm.description,
        templateId: newForm.templateId || undefined,
        tags: newForm.tags || undefined,
        deadline: newForm.deadline || undefined,
        budget: newForm.budget ? parseFloat(newForm.budget) : undefined,
      });
      setShowNew(false);
      setNewForm({ name: '', description: '', templateId: '', tags: '', deadline: '', budget: '' });
      navigate(`/projects/${data.id}`);
    } catch {
      toast.error('Ошибка создания');
    } finally {
      setCreating(false);
    }
  };

  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm('Удалить проект? Это действие необратимо.')) return;
    try {
      await api.delete(`/projects/${id}`);
      setProjects((p) => p.filter((pr) => pr.id !== id));
      setStats((s) => s ? { ...s, total: s.total - 1 } : s);
      toast.success('Проект удалён');
    } catch { toast.error('Ошибка'); }
  };

  const duplicateProject = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    try {
      const { data } = await api.post(`/projects/${id}/duplicate`);
      setProjects((p) => [data, ...p]);
      toast.success('Проект скопирован');
    } catch { toast.error('Ошибка копирования'); }
  };

  // Collect all unique tags
  const allTags = Array.from(new Set(
    projects.flatMap((p) => (p.tags ? p.tags.split(',').map((t) => t.trim()).filter(Boolean) : []))
  ));

  // Filtering
  const filtered = projects.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q) || p.tags?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchTag = !tagFilter || (p.tags || '').split(',').map(t => t.trim()).includes(tagFilter);
    return matchSearch && matchStatus && matchTag;
  });

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === 'name') return a.name.localeCompare(b.name, 'ru');
    if (sortKey === 'createdAt') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortKey === 'amount') return (b.estimationTotal || 0) - (a.estimationTotal || 0);
    if (sortKey === 'deadline') {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const inputCls = 'w-full px-3 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-1)] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder:text-[var(--text-3)]';

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <Navbar onCommandPalette={onCommandPalette} />

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats Banner */}
        {!loading && stats && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Всего проектов', value: String(stats.total), icon: FolderOpen, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' },
              { label: 'Активных', value: String(stats.byStatus.active), icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
              { label: 'Завершённых', value: String(stats.byStatus.completed), icon: CheckCircle, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/30' },
              { label: 'Общая сумма', value: stats.totalAmount > 0 ? `${(stats.totalAmount / 1_000_000).toFixed(2)} млн ₽` : '—', icon: Archive, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30' },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] px-5 py-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${card.bg}`}>
                    <Icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                  <div>
                    <div className="text-xl font-bold text-[var(--text-1)]">{card.value}</div>
                    <div className="text-xs text-[var(--text-3)] mt-0.5">{card.label}</div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
          <h1 className="text-2xl font-bold text-[var(--text-1)] flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-blue-600" />
            Мои проекты
          </h1>
          <div className="flex-1" />
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Новый проект
          </button>
        </div>

        {/* Toolbar: search + filters + sort + view toggle */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-3)]" />
            <input
              type="text"
              placeholder="Поиск проектов..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputCls} pl-9 !py-1.5`}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-1)]">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status filter tabs */}
          <div className="flex items-center gap-1 bg-[var(--bg-input)] rounded-xl p-1 border border-[var(--border)]">
            {[
              { id: 'all', label: 'Все' },
              { id: 'draft', label: 'Черновики' },
              { id: 'active', label: 'Активные' },
              { id: 'completed', label: 'Готовые' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  statusFilter === tab.id
                    ? 'bg-[var(--bg-card)] text-[var(--text-1)] shadow-sm'
                    : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tag filter */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Tag className="w-3.5 h-3.5 text-[var(--text-3)]" />
              {allTags.slice(0, 5).map((tag) => (
                <button
                  key={tag}
                  onClick={() => setTagFilter(tagFilter === tag ? '' : tag)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                    tagFilter === tag ? tagColor(tag) + ' ring-2 ring-offset-1 ring-current' : tagColor(tag)
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1" />

          {/* Sort dropdown */}
          <div className="relative" ref={sortMenuRef}>
            <button
              onClick={() => setShowSortMenu((s) => !s)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--text-2)] bg-[var(--bg-input)] border border-[var(--border)] rounded-xl hover:bg-[var(--bg-card)] transition-colors"
            >
              <SortAsc className="w-3.5 h-3.5" />
              {SORT_LABELS[sortKey]}
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
            <AnimatePresence>
              {showSortMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1.5 w-44 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-xl z-30 py-1 overflow-hidden"
                >
                  {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => { setSortKey(key); setShowSortMenu(false); }}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        sortKey === key
                          ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 font-medium'
                          : 'text-[var(--text-1)] hover:bg-[var(--bg-input)]'
                      }`}
                    >
                      {SORT_LABELS[key]}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-[var(--bg-input)] border border-[var(--border)] rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[var(--bg-card)] shadow-sm text-[var(--text-1)]' : 'text-[var(--text-3)] hover:text-[var(--text-1)]'}`}
              title="Сетка"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[var(--bg-card)] shadow-sm text-[var(--text-1)]' : 'text-[var(--text-3)] hover:text-[var(--text-1)]'}`}
              title="Список"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Active filters indicator */}
        {(tagFilter || statusFilter !== 'all') && (
          <div className="flex items-center gap-2 mb-4 text-xs text-[var(--text-3)]">
            <Filter className="w-3.5 h-3.5" />
            <span>Фильтр активен:</span>
            {statusFilter !== 'all' && <StatusBadge status={statusFilter} />}
            {tagFilter && <TagChip tag={tagFilter} onRemove={() => setTagFilter('')} />}
            <button onClick={() => { setStatusFilter('all'); setTagFilter(''); setSearch(''); }} className="text-blue-500 hover:text-blue-700 ml-1">
              Сбросить всё
            </button>
          </div>
        )}

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Projects */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'space-y-3'}>
                {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
              </div>
            ) : sorted.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-950/40 dark:to-indigo-950/40 flex items-center justify-center mb-5">
                  <Building2 className="w-10 h-10 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-[var(--text-1)] mb-2">
                  {search || statusFilter !== 'all' || tagFilter ? 'Ничего не найдено' : 'Нет проектов'}
                </h3>
                <p className="text-sm text-[var(--text-3)] mb-6 max-w-xs">
                  {search || statusFilter !== 'all' || tagFilter
                    ? 'Попробуйте изменить фильтры'
                    : 'Создайте первый проект, чтобы начать работу'}
                </p>
                {!search && statusFilter === 'all' && !tagFilter && (
                  <button
                    onClick={() => setShowNew(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Создать проект
                  </button>
                )}
              </motion.div>
            ) : (
              <AnimatePresence mode="popLayout">
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'space-y-3'}>
                  {sorted.map((project, idx) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: Math.min(idx * 0.04, 0.24) }}
                    >
                      {viewMode === 'grid' ? (
                        <ProjectCard
                          project={project}
                          onDelete={deleteProject}
                          onDuplicate={duplicateProject}
                        />
                      ) : (
                        <ProjectRow
                          project={project}
                          onDelete={deleteProject}
                          onDuplicate={duplicateProject}
                        />
                      )}
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            )}
          </div>

          {/* Sidebar: Activity */}
          <div className="hidden lg:block">
            <ActivityFeed />
          </div>
        </div>
      </div>

      {/* New Project Modal */}
      <AnimatePresence>
        {showNew && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setShowNew(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={() => setShowNew(false)}
            >
              <div
                className="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-lg border border-[var(--border)] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2.5 font-semibold text-[var(--text-1)]">
                    <Plus className="w-4 h-4 text-blue-500" />
                    Новый проект
                  </div>
                  <button onClick={() => setShowNew(false)} className="p-1.5 rounded-lg text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-input)] transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <label className="text-xs font-medium text-[var(--text-3)] block mb-1.5">Название *</label>
                    <input
                      type="text" autoFocus
                      placeholder="Напр: Жилой дом 8×10"
                      value={newForm.name}
                      onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && createProject()}
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[var(--text-3)] block mb-1.5">Описание</label>
                    <textarea
                      placeholder="Краткое описание..."
                      value={newForm.description}
                      onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                      rows={2}
                      className={inputCls + ' resize-none'}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-[var(--text-3)] block mb-1.5 flex items-center gap-1"><Tag className="w-3 h-3" /> Теги</label>
                      <input
                        type="text"
                        placeholder="баня, жилой, дача"
                        value={newForm.tags}
                        onChange={(e) => setNewForm({ ...newForm, tags: e.target.value })}
                        className={inputCls}
                      />
                      <p className="text-[10px] text-[var(--text-3)] mt-1">Через запятую</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--text-3)] block mb-1.5 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Бюджет (₽)</label>
                      <input
                        type="number"
                        placeholder="1 500 000"
                        value={newForm.budget}
                        onChange={(e) => setNewForm({ ...newForm, budget: e.target.value })}
                        className={inputCls}
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-[var(--text-3)] block mb-1.5 flex items-center gap-1"><Calendar className="w-3 h-3" /> Дедлайн</label>
                      <input
                        type="date"
                        value={newForm.deadline}
                        onChange={(e) => setNewForm({ ...newForm, deadline: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--text-3)] block mb-1.5">Шаблон</label>
                      <select
                        value={newForm.templateId}
                        onChange={(e) => setNewForm({ ...newForm, templateId: e.target.value })}
                        className={inputCls}
                      >
                        <option value="">Пустой проект</option>
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>{t.preview} {t.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="px-6 pb-6 flex gap-3">
                  <button onClick={() => setShowNew(false)} className="flex-1 py-2.5 border border-[var(--border)] text-[var(--text-2)] rounded-xl text-sm hover:bg-[var(--bg-input)] transition-colors">
                    Отмена
                  </button>
                  <button
                    onClick={createProject}
                    disabled={creating || !newForm.name.trim()}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {creating ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Создание...</> : <><Plus className="w-4 h-4" />Создать</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating action button for mobile */}
      <button
        onClick={() => setShowNew(true)}
        className="fixed bottom-6 right-6 z-30 md:hidden w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-2xl flex items-center justify-center transition-all active:scale-95"
        title="Новый проект (Ctrl+N)"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}

// ---- Project Card (grid) ----
function ProjectCard({ project, onDelete, onDuplicate }: {
  project: Project;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onDuplicate: (id: string, e: React.MouseEvent) => void;
}) {
  const tags = project.tags ? project.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
  const est = project.estimationTotal || 0;
  const budget = project.budget;
  const overBudget = budget && est > 0 && est > budget;

  return (
    <Link to={`/projects/${project.id}`} className="block group">
      <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-5 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg transition-all duration-200 relative overflow-hidden">
        {/* Colored top accent */}
        <div className={`absolute top-0 left-0 right-0 h-0.5 ${STATUS_CONFIG[project.status]?.dot === 'bg-blue-500 animate-pulse' ? 'bg-blue-500' : STATUS_CONFIG[project.status]?.dot === 'bg-green-500' ? 'bg-green-500' : STATUS_CONFIG[project.status]?.dot === 'bg-yellow-500' ? 'bg-yellow-500' : 'bg-slate-300 dark:bg-slate-700'}`} />

        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 min-w-0">
            {project.currentVersion?.geometryJson && (
              <FloorPlanThumb geometryJson={project.currentVersion.geometryJson} />
            )}
            <div className="min-w-0">
              <h3 className="font-semibold text-[var(--text-1)] text-sm group-hover:text-blue-600 transition-colors truncate">{project.name}</h3>
              {project.description && (
                <p className="text-xs text-[var(--text-3)] mt-0.5 line-clamp-2">{project.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tags.slice(0, 3).map((tag) => <TagChip key={tag} tag={tag} />)}
            {tags.length > 3 && <span className="text-[10px] text-[var(--text-3)]">+{tags.length - 3}</span>}
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={project.status} />
          {project.deadline && <DeadlineBadge deadline={project.deadline} />}
          {est > 0 && (
            <span className={`text-xs font-semibold ${overBudget ? 'text-red-500' : 'text-[var(--text-2)]'}`}>
              {est.toLocaleString('ru-RU')} ₽
              {budget && <span className="font-normal text-[var(--text-3)]"> / {budget.toLocaleString('ru-RU')} ₽</span>}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border)]">
          <span className="text-[11px] text-[var(--text-3)] flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(project.updatedAt).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => onDuplicate(project.id, e)}
              className="p-1.5 rounded-lg text-[var(--text-3)] hover:bg-[var(--bg-input)] hover:text-[var(--text-1)] transition-colors"
              title="Дублировать"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => onDelete(project.id, e)}
              className="p-1.5 rounded-lg text-[var(--text-3)] hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-colors"
              title="Удалить"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ---- Project Row (list) ----
function ProjectRow({ project, onDelete, onDuplicate }: {
  project: Project;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onDuplicate: (id: string, e: React.MouseEvent) => void;
}) {
  const tags = project.tags ? project.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
  const est = project.estimationTotal || 0;
  return (
    <Link to={`/projects/${project.id}`} className="block group">
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] px-4 py-3 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all flex items-center gap-4">
        {project.currentVersion?.geometryJson && (
          <div className="flex-shrink-0">
            <FloorPlanThumb geometryJson={project.currentVersion.geometryJson} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-[var(--text-1)] group-hover:text-blue-600 transition-colors">{project.name}</span>
            <StatusBadge status={project.status} />
            {tags.slice(0, 2).map((tag) => <TagChip key={tag} tag={tag} />)}
          </div>
          {project.description && (
            <p className="text-xs text-[var(--text-3)] mt-0.5 truncate">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          {project.deadline && <DeadlineBadge deadline={project.deadline} />}
          {est > 0 && <span className="text-sm font-semibold text-[var(--text-1)]">{est.toLocaleString('ru-RU')} ₽</span>}
          <span className="text-xs text-[var(--text-3)] whitespace-nowrap hidden sm:block">
            {new Date(project.updatedAt).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => onDuplicate(project.id, e)} className="p-1.5 rounded-lg text-[var(--text-3)] hover:bg-[var(--bg-input)] transition-colors" title="Дублировать">
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button onClick={(e) => onDelete(project.id, e)} className="p-1.5 rounded-lg text-[var(--text-3)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors" title="Удалить">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
